import { scanFormulaStringLiterals, type FormulaLabels } from './formulaSyntax';

export interface FormulaIssue {
  start: number;
  end: number;
  message: string;
}

type TokenKind = 'number' | 'string' | 'ref' | 'word' | 'func' | 'op' | 'lparen' | 'rparen' | 'comma' | 'invalid';

interface Token {
  kind: TokenKind;
  start: number;
  end: number;
  text: string;
}

interface Frame {
  funcName: string | null;
  open: Token;
  args: Token[][];
}

const GROUP_FUNCTIONS = new Set(['IF', 'SWITCH', 'THRESHOLD', 'VALUE', 'SUM']);
const MATH_FUNCTIONS = new Set(['floor', 'ceil', 'round', 'min', 'max', 'abs']);
const OPERATORS = ['<>', '<=', '>=', '..', '+', '-', '*', '/', '=', '<', '>', '?', ':'];

function tokenize(source: string, issues: FormulaIssue[]): Token[] {
  const tokens: Token[] = [];
  const scan = scanFormulaStringLiterals(source);
  const literalByStart = new Map(scan.literals.map((literal) => [literal.start, literal]));
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '"') {
      const literal = literalByStart.get(i);
      if (!literal) {
        issues.push({ start: i, end: source.length, message: 'Unterminated text. Add a closing quote (").' });
        break;
      }
      tokens.push({ kind: 'string', start: i, end: literal.end, text: source.slice(i, literal.end) });
      i = literal.end;
      continue;
    }

    const rest = source.slice(i);
    let match: RegExpMatchArray | null;

    if ((match = rest.match(/^@([a-zA-Z_][a-zA-Z0-9_]*)/))) {
      tokens.push({ kind: 'ref', start: i, end: i + match[0].length, text: match[1] });
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^\d+(?:\.\d+)?/))) {
      tokens.push({ kind: 'number', start: i, end: i + match[0].length, text: match[0] });
      i += match[0].length;
      continue;
    }
    if ((match = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/))) {
      const word = match[0];
      const isCall = /^\s*\(/.test(source.slice(i + word.length));
      tokens.push({ kind: isCall ? 'func' : 'word', start: i, end: i + word.length, text: word });
      i += word.length;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen', start: i, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', start: i, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma', start: i, end: i + 1, text: ch });
      i += 1;
      continue;
    }
    const operator = OPERATORS.find((op) => rest.startsWith(op));
    if (operator) {
      tokens.push({ kind: 'op', start: i, end: i + operator.length, text: operator });
      i += operator.length;
      continue;
    }

    const message = ch === '@'
      ? 'A label name must follow "@".'
      : `Unexpected character "${ch}".`;
    tokens.push({ kind: 'invalid', start: i, end: i + 1, text: ch });
    issues.push({ start: i, end: i + 1, message });
    i += 1;
  }

  return tokens;
}

function hasGeneratedLabels(prefix: string, labels: FormulaLabels): boolean {
  const pattern = /^[1-9]\d*$/;
  return Object.keys(labels).some((label) => label.startsWith(prefix) && pattern.test(label.slice(prefix.length)));
}

/**
 * Finds the parts of a formula that are broken, as character ranges in `source`.
 * Best-effort: an invalid formula may produce no issues.
 */
export function findFormulaIssues(
  source: string,
  labels: FormulaLabels,
  options: { forbiddenRefs?: Set<string>; circularLabels?: Set<string>; selfReferenceMessage?: string } = {}
): FormulaIssue[] {
  const issues: FormulaIssue[] = [];
  const tokens = tokenize(source, issues);
  const stack: Frame[] = [];
  const root: Token[][] = [[]];
  let previous: Token | null = null;
  let expectOperand = true;

  const currentArgs = () => (stack.length > 0 ? stack[stack.length - 1].args : root);
  const pushToken = (token: Token) => currentArgs()[currentArgs().length - 1].push(token);
  const report = (token: Token, message: string) => issues.push({ start: token.start, end: token.end, message });
  const inFunction = () => stack.some((frame) => frame.funcName !== null);
  const startsOperand = (token: Token) => {
    if (!expectOperand) report(token, 'Missing operator before this value.');
    pushToken(token);
    expectOperand = false;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    switch (token.kind) {
      case 'invalid':
        break;

      case 'number':
      case 'string':
        startsOperand(token);
        break;

      case 'ref': {
        const top = stack[stack.length - 1];
        const topArgIndex = top ? top.args.length - 1 : -1;
        const inSum = stack.some((frame) => frame.funcName === 'SUM');
        const isGeneratedGroupArg = !!top && ((top.funcName === 'THRESHOLD' && topArgIndex === 1) || (top.funcName === 'VALUE' && topArgIndex === 0));
        if (options.forbiddenRefs?.has(token.text)) {
          report(token, options.selfReferenceMessage || `A formula cannot reference its own label (@${token.text}).`);
        } else if (options.circularLabels?.has(token.text)) {
          report(token, `@${token.text} creates a circular reference.`);
        } else if (isGeneratedGroupArg) {
          if (!hasGeneratedLabels(token.text, labels)) {
            report(token, `No table rows generate labels named @${token.text}1, @${token.text}2, ...`);
          }
        } else if (inSum) {
          // SUM accepts generated label groups, which are not scalar labels.
        } else if (!(token.text in labels)) {
          report(token, `@${token.text} is not an available label.`);
        }
        startsOperand(token);
        break;
      }

      case 'word':
        if (!inFunction()) {
          report(token, `"${token.text}" is not valid here. Wrap text in quotes, e.g. "${token.text}".`);
        }
        startsOperand(token);
        break;

      case 'func': {
        const upper = token.text.toUpperCase();
        const isGroup = GROUP_FUNCTIONS.has(upper);
        if (!isGroup && !MATH_FUNCTIONS.has(token.text)) {
          report(token, `Unknown function "${token.text}".`);
        }
        if (!expectOperand) report(token, 'Missing operator before this function.');
        pushToken(token);
        // The next token is always the opening parenthesis; consume it here.
        const open = tokens[index + 1];
        index += 1;
        stack.push({
          funcName: isGroup ? upper : MATH_FUNCTIONS.has(token.text) ? token.text : '?',
          open: token,
          args: [[]],
        });
        expectOperand = true;
        previous = open;
        continue;
      }

      case 'lparen':
        if (!expectOperand) report(token, 'Missing operator before "(".');
        pushToken(token);
        stack.push({ funcName: null, open: token, args: [[]] });
        expectOperand = true;
        break;

      case 'op': {
        const unary = token.text === '+' || token.text === '-';
        if (expectOperand && !unary) {
          report(token, `"${token.text}" needs a value before it.`);
        }
        pushToken(token);
        expectOperand = true;
        break;
      }

      case 'comma': {
        const frame = stack[stack.length - 1];
        if (!frame || frame.funcName === null) {
          report(token, 'Commas can only separate function arguments.');
        } else {
          if (expectOperand) report(token, 'Missing argument before this comma.');
          frame.args.push([]);
        }
        expectOperand = true;
        break;
      }

      case 'rparen': {
        const frame = stack.pop();
        if (!frame) {
          report(token, 'Closing ")" has no matching "(".');
          break;
        }
        const isEmpty = frame.args.length === 1 && frame.args[0].length === 0;
        if (expectOperand && !isEmpty) {
          const last = previous;
          if (last?.kind === 'comma') report(token, 'Missing argument before ")".');
          else if (last) report(last, `"${last.text}" needs a value after it.`);
        }
        if (frame.funcName === null) {
          if (isEmpty) report(token, 'Empty parentheses need a value inside.');
        } else {
          validateFunctionCall(frame, issues);
        }
        expectOperand = false;
        break;
      }
    }

    previous = token;
  }

  for (const frame of stack) {
    issues.push({
      start: frame.open.start,
      end: frame.open.end,
      message: frame.funcName === null ? 'This "(" is never closed.' : `The parentheses of ${frame.open.text}( are never closed.`,
    });
  }

  if (expectOperand && previous && previous.kind === 'op' && stack.length === 0) {
    report(previous, `"${previous.text}" needs a value after it.`);
  }

  return dedupeIssues(issues);
}

function validateFunctionCall(frame: Frame, issues: FormulaIssue[]) {
  const name = frame.funcName;
  if (!name || name === '?') return;
  const isEmpty = frame.args.length === 1 && frame.args[0].length === 0;
  const count = isEmpty ? 0 : frame.args.length;
  const range = { start: frame.open.start, end: frame.open.end };
  const fail = (message: string) => issues.push({ ...range, message });

  const isSingleRef = (arg: Token[] | undefined) => !!arg && arg.length === 1 && arg[0].kind === 'ref';

  switch (name) {
    case 'IF':
      if (count !== 3) fail(`IF needs 3 arguments (condition, value if true, value if false) but has ${count}.`);
      break;
    case 'SWITCH':
      if (count < 3) fail(`SWITCH needs a value, at least one case and its result, but has ${count} argument${count === 1 ? '' : 's'}.`);
      break;
    case 'THRESHOLD':
      if (count !== 2 && count !== 3) fail(`THRESHOLD needs 2 or 3 arguments but has ${count}.`);
      else if (!isSingleRef(frame.args[1])) fail('The second argument of THRESHOLD must be a single @label group.');
      break;
    case 'VALUE':
      if (count !== 2 && count !== 3) fail(`VALUE needs 2 or 3 arguments but has ${count}.`);
      else if (!isSingleRef(frame.args[0])) fail('The first argument of VALUE must be a single @label group.');
      break;
    case 'SUM':
      if (count !== 1) fail(`SUM needs 1 argument but has ${count}.`);
      else if (!frame.args[0].some((token) => token.kind === 'ref')) fail('SUM needs at least one @label group, e.g. SUM(@weight).');
      break;
    default:
      if (count === 0) fail(`${name} needs at least one argument.`);
  }
}

function dedupeIssues(issues: FormulaIssue[]): FormulaIssue[] {
  const seen = new Set<string>();
  return issues
    .filter((issue) => {
      const key = `${issue.start}:${issue.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
}
