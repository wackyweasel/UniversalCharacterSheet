import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FormulaHelpDetailsButtonProps {
  className?: string;
}

export function FormulaHelpDetailsButton({ className = '' }: FormulaHelpDetailsButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-medium text-theme-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent rounded-sm ${className}`}
      >
        More details
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[10000]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="formula-help-title"
            className="fixed left-1/2 top-1/2 z-[10001] w-[min(92vw,520px)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-button border border-theme-border bg-theme-paper p-4 shadow-theme text-theme-ink"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 id="formula-help-title" className="font-heading text-base font-bold text-theme-ink">
                Formula Details
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2 py-1 text-sm text-theme-muted hover:text-theme-ink rounded-button hover:bg-theme-accent/10"
                aria-label="Close formula details"
              >
                x
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-theme-ink">
              <p>
                Use labels with <span className="font-mono">@</span>, such as <span className="font-mono">@str</span> or <span className="font-mono">@xp</span>. Formulas can combine arithmetic, parentheses, and math functions such as <span className="font-mono">floor()</span>, <span className="font-mono">ceil()</span>, <span className="font-mono">round()</span>, <span className="font-mono">min()</span>, <span className="font-mono">max()</span>, and <span className="font-mono">abs()</span>.
              </p>

              <div>
                <h4 className="font-semibold text-theme-ink mb-1">Conditions</h4>
                <p>
                  <span className="font-mono">IF(condition, trueValue, falseValue)</span> supports comparisons such as <span className="font-mono">=</span>, <span className="font-mono">&lt;&gt;</span>, <span className="font-mono">&lt;</span>, <span className="font-mono">&gt;</span>, <span className="font-mono">&lt;=</span>, and <span className="font-mono">&gt;=</span>.
                </p>
                <code className="mt-1 block rounded bg-theme-background/60 px-2 py-1 font-mono text-[11px] text-theme-ink">
                  IF(@hp &lt;= 0, 0, @hp)
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-theme-ink mb-1">Ranges</h4>
                <p>
                  <span className="font-mono">SWITCH()</span> can match exact values or inclusive ranges written as <span className="font-mono">low..high</span>.
                </p>
                <code className="mt-1 block rounded bg-theme-background/60 px-2 py-1 font-mono text-[11px] text-theme-ink whitespace-pre-wrap">
                  SWITCH(@roll, 1..5, 0, 6..10, 1, 2)
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-theme-ink mb-1">Table Columns</h4>
                <p>
                  <span className="font-mono">THRESHOLD(value, @columnLabel, start)</span> counts generated table-column labels like <span className="font-mono">xp1</span>, <span className="font-mono">xp2</span>, and <span className="font-mono">xp3</span>. <span className="font-mono">VALUE(@columnLabel, index, fallback)</span> reads one generated row. <span className="font-mono">SUM(@columnLabel)</span> adds every numeric value in a column, and <span className="font-mono">SUM(@qty * @weight)</span> adds a row-wise expression across matching columns. Empty sums return <span className="font-mono">0</span>.
                </p>
                <code className="mt-1 block rounded bg-theme-background/60 px-2 py-1 font-mono text-[11px] text-theme-ink whitespace-pre-wrap">
                  THRESHOLD(@xp, @xp_threshold, 1)
                  {'\n'}VALUE(@xp_threshold, THRESHOLD(@xp, @xp_threshold), 0)
                  {'\n'}SUM(@treasure)
                  {'\n'}SUM(@qty * @weight)
                </code>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}