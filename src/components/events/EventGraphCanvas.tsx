import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  ViewportPortal,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Character } from '../../types';
import type { EventDraft } from '../../events/editorDraft';
import { jumpCurve } from '../../events/jumpCurve';
import {
  findEffect,
  findStep,
  GRAPH_SIZES,
  isSlotBeside,
  parseRollBranch,
  type BranchSection,
  type EffectLocation,
  type EventGraph,
  type GraphDirection,
  type GraphEdge,
  type GraphJumpSource,
  type GraphNode,
  type GraphSide,
  type GraphSlot,
} from '../../events/graph';
import { findWidget } from '../../events/helpers';
import { describeEffect, describeTrigger, getEventIcon } from '../../events/registry';
import { PlusIcon } from '../icons';

type NodeData = {
  graph: GraphNode;
  pill?: string;
  tone?: 'when' | 'if' | 'then' | 'else';
  icon?: string;
  text?: string;
  /** Nothing chosen or written yet. */
  blank?: boolean;
  problem?: string;
};
type FlowNode = Node<NodeData>;
type FlowEdge = Edge<{ link: GraphEdge }>;
/** What the "+" of a link or a placeholder can add. */
type AddKind = 'effect' | 'condition' | 'end';

interface GraphUi {
  direction: GraphDirection;
  /** Where every node is, for a jump to go around them. */
  nodes: GraphNode[];
  /** Link whose "+" a dragged effect would drop on. */
  dropEdgeId: string | null;
  /** Where the effect being dragged comes from. */
  dragFrom: EffectLocation | null;
  menuEdgeId: string | null;
  onPlus: (link: GraphEdge, button: HTMLElement) => void;
  onAdd: (slot: GraphSlot, kind: AddKind) => void;
  /** Whether a link can be dragged from this handle of a node to make a side jump. */
  canJumpFrom: (nodeId: string, handle?: GraphSide) => boolean;
  /** Whether the jump being dragged can land on the node. */
  isJumpTarget: (nodeId: string) => boolean;
  onRemoveJump: (link: GraphEdge) => void;
}

const GraphUiContext = createContext<GraphUi>({
  direction: 'down',
  nodes: [],
  dropEdgeId: null,
  dragFrom: null,
  menuEdgeId: null,
  onPlus: () => {},
  onAdd: () => {},
  canJumpFrom: () => false,
  isJumpTarget: () => false,
  onRemoveJump: () => {},
});

/** The edges of a node that links use: where the flow comes in, where it goes on, and where a condition's "no" side leaves. */
const PORTS = {
  down: { entry: Position.Top, exit: Position.Bottom, side: Position.Right },
  right: { entry: Position.Left, exit: Position.Right, side: Position.Bottom },
};
const usePorts = () => PORTS[useContext(GraphUiContext).direction];

const CORNER = 12;
/** How close, in graph units, a dragged effect must be to a "+" to drop on it. */
const DROP_RADIUS = 90;
const MENU_WIDTH = 208;
const MENU_HEIGHT = 156;
const VIEW_PADDING = 24;
/** A long event opens no smaller than this, so its text stays readable; the rest is a pan away. */
const MIN_START_ZOOM = 0.85;

const ADD_HINT = 'Add an effect, a condition or an end here';
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const JUMP_HINT = 'Drag to any step to jump there';
const REMOVE_JUMP_HINT = 'Remove this jump';

/** Where a link can be dropped on a node: all over it, but only while a jump is being dragged that can land there. */
function DropHandle({ nodeId, entry }: { nodeId: string; entry: Position }) {
  const ui = useContext(GraphUiContext);
  return <Handle type="target" position={entry} isConnectable={ui.isJumpTarget(nodeId)} isConnectableStart={false} className="event-handle--drop" />;
}

function CardNode({ data }: NodeProps<FlowNode>) {
  const ui = useContext(GraphUiContext);
  const ports = usePorts();
  const { graph, pill, tone, icon, text, blank, problem } = data;
  const isCondition = graph.kind === 'condition';
  const branches = isCondition || !!graph.branchStepId;
  const exitId: GraphSide | undefined = branches ? 'yes' : undefined;
  const exitJump = ui.canJumpFrom(graph.id, exitId);
  const sideJump = branches && ui.canJumpFrom(graph.id, 'no');
  return (
    <div
      className={`event-node event-node--${graph.kind} ${graph.kind === 'effect' && graph.side === 'no' ? 'event-node--otherwise' : ''} ${problem ? 'event-node--problem' : ''} ${ui.isJumpTarget(graph.id) ? 'event-node--landing' : ''}`}
      title={problem}
    >
      {graph.kind !== 'trigger' && <DropHandle nodeId={graph.id} entry={ports.entry} />}
      <span className="event-node__icon" aria-hidden="true">{problem ? '⚠️' : icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`event-flow__pill event-flow__pill--${tone} event-node__pill`}>{pill}</span>
        <span className={`event-node__text ${blank ? 'event-node__text--blank' : isCondition ? 'event-node__text--formula' : ''}`}>{text}</span>
      </span>
      <Handle
        type="source"
        position={ports.exit}
        id={exitId}
        isConnectable={exitJump}
        className={exitJump ? 'event-handle--jump' : undefined}
        title={exitJump ? JUMP_HINT : undefined}
      />
      {branches && (
        <Handle
          type="source"
          position={ports.side}
          id="no"
          isConnectable={sideJump}
          className={sideJump ? 'event-handle--jump' : undefined}
          title={sideJump ? JUMP_HINT : undefined}
        />
      )}
    </div>
  );
}

function AddNode({ data }: NodeProps<FlowNode>) {
  const ui = useContext(GraphUiContext);
  const ports = PORTS[ui.direction];
  const { graph, problem } = data;
  const className = `event-node-add nodrag nopan ${problem ? 'event-node-add--problem' : ''}`;
  return (
    <div className="event-node-add-pair" title={problem}>
      <Handle type="target" position={ports.entry} isConnectable={false} />
      <button type="button" className={className} onClick={() => graph.slot && ui.onAdd(graph.slot, 'effect')}>
        <PlusIcon className="h-3.5 w-3.5" /> Effect
      </button>
      <button type="button" className={className} onClick={() => graph.slot && ui.onAdd(graph.slot, 'condition')}>
        <PlusIcon className="h-3.5 w-3.5" /> Condition
      </button>
      <button type="button" className={className} onClick={() => graph.slot && ui.onAdd(graph.slot, 'end')}>
        <PlusIcon className="h-3.5 w-3.5" /> End
      </button>
      <Handle type="source" position={ports.exit} isConnectable={false} />
    </div>
  );
}

function JoinNode({ id }: NodeProps<FlowNode>) {
  const ui = useContext(GraphUiContext);
  const ports = usePorts();
  const jump = ui.canJumpFrom(id);
  return (
    <div className="event-node-join">
      <Handle type="target" position={ports.entry} id="top" isConnectable={false} />
      <Handle type="target" position={ports.side} id="side" isConnectable={false} />
      <Handle
        type="source"
        position={ports.exit}
        isConnectable={jump}
        className={jump ? 'event-handle--jump event-handle--center' : undefined}
        title={jump ? JUMP_HINT : undefined}
      />
    </div>
  );
}

function EndNode({ id, data }: NodeProps<FlowNode>) {
  const ui = useContext(GraphUiContext);
  const ports = usePorts();
  const stops = data.graph.kind === 'stop';
  return (
    <div
      className={`event-node-end ${stops ? 'event-node-end--stop' : ''} ${ui.isJumpTarget(id) ? 'event-node--landing' : ''}`}
      title={stops ? 'The event stops here when the condition is false' : undefined}
    >
      {stops ? <Handle type="target" position={ports.entry} isConnectable={false} /> : <DropHandle nodeId={id} entry={ports.entry} />}
      {stops ? 'Stop' : 'End'}
    </div>
  );
}

const nodeTypes = { trigger: CardNode, condition: CardNode, effect: CardNode, add: AddNode, join: JoinNode, stop: EndNode, end: EndNode };

/**
 * The path of a link between two points, with rounded corners. It is worked out along the flow and across it,
 * so the same bends serve a flow that runs down and one that runs right.
 */
function linkPath(link: GraphEdge, direction: GraphDirection, sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  const down = direction === 'down';
  const at = (main: number, cross: number) => (down ? `${cross} ${main}` : `${main} ${cross}`);
  const [sm, sc, tm, tc] = down ? [sourceY, sourceX, targetY, targetX] : [sourceX, sourceY, targetX, targetY];
  if (link.shape === 'out') return `M ${at(sm, sc)} L ${at(sm, tc - CORNER)} Q ${at(sm, tc)} ${at(sm + CORNER, tc)} L ${at(tm, tc)}`;
  if (link.shape === 'in') return `M ${at(sm, sc)} L ${at(tm - CORNER, sc)} Q ${at(tm, sc)} ${at(tm, sc - CORNER)} L ${at(tm, tc)}`;
  if (link.shape === 'around') {
    const via = link.via ?? sc + CORNER * 2;
    return `M ${at(sm, sc)} L ${at(sm, via - CORNER)} Q ${at(sm, via)} ${at(sm + CORNER, via)} L ${at(tm - CORNER, via)} Q ${at(tm, via)} ${at(tm, via - CORNER)} L ${at(tm, tc)}`;
  }
  return `M ${at(sm, sc)} L ${at(tm, tc)}`;
}

function LinkEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<FlowEdge>) {
  const ui = useContext(GraphUiContext);
  const link = data?.link;
  if (!link) return null;
  const className = `event-link ${link.otherwise ? 'event-link--otherwise' : ''} ${link.shape === 'jump' ? 'event-link--jump' : ''} ${ui.dropEdgeId === id ? 'event-link--drop' : ''}`;
  if (link.shape === 'jump') {
    const { path, middle } = jumpCurve({
      direction: ui.direction,
      nodes: ui.nodes,
      sourceId: link.source,
      targetId: link.target,
      aside: link.sourceHandle === 'no',
      from: { x: sourceX, y: sourceY },
      to: { x: targetX, y: targetY },
    });
    return (
      <>
        <BaseEdge id={id} path={path} interactionWidth={0} className={className} />
        <EdgeLabelRenderer>
          <button
            type="button"
            className="event-link__add event-link__remove nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${middle.x}px, ${middle.y}px)`, pointerEvents: 'all' }}
            aria-label={REMOVE_JUMP_HINT}
            title={REMOVE_JUMP_HINT}
            onClick={() => ui.onRemoveJump(link)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </EdgeLabelRenderer>
      </>
    );
  }
  return <BaseEdge id={id} path={linkPath(link, ui.direction, sourceX, sourceY, targetX, targetY)} interactionWidth={0} className={className} />;
}

const edgeTypes = { link: LinkEdge };

// React Flow's own description says the arrow keys move a node, which this graph lays out itself.
// Both keys are set because React Flow 12 reads the "keyboardDisabled" one while keyboard support is on.
const NODE_KEYBOARD_HELP = 'Press enter or space to select a node and edit its settings. Press delete to remove an effect.';
const ariaLabels = {
  'node.a11yDescription.default': NODE_KEYBOARD_HELP,
  'node.a11yDescription.keyboardDisabled': NODE_KEYBOARD_HELP,
};

/** The "Yes" and "No" marks and the "+" of every link, in the order the event runs so that Tab follows the flow. */
function LinkControls({ graph }: { graph: EventGraph }) {
  const ui = useContext(GraphUiContext);
  const nodes = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  return (
    <ViewportPortal>
      {graph.edges.map((link) => {
        const { slot, plus, label } = link;
        const source = nodes.get(link.source);
        // The links of an effect follow it while it is dragged, so their "+" would float away from them.
        const hidden = !!ui.dragFrom && !!slot && isSlotBeside(ui.dragFrom, slot);
        // Each mark sits by the edge its link leaves from, just off the link and clear of its "+".
        const ahead = link.sourceHandle === (ui.direction === 'down' ? 'yes' : 'no');
        return (
          <Fragment key={link.id}>
            {label && source && (
              <span
                className="event-link__label"
                style={{
                  transform: ahead
                    ? `translate(${source.x + source.width / 2 + 8}px, ${source.y + source.height + 5}px)`
                    : `translate(${source.x + source.width + 8}px, ${source.y + source.height / 2 - (ui.direction === 'down' ? 19 : 27)}px)`,
                }}
              >
                {label}
              </span>
            )}
            {slot && plus && !hidden && (
              <button
                type="button"
                className={`event-link__add nodrag nopan ${ui.dragFrom ? 'event-link__add--target' : ''} ${ui.dropEdgeId === link.id ? 'event-link__add--drop' : ''}`}
                style={{ transform: `translate(-50%, -50%) translate(${plus.x}px, ${plus.y}px)` }}
                aria-label={ADD_HINT}
                title={ADD_HINT}
                aria-haspopup="menu"
                aria-expanded={ui.menuEdgeId === link.id}
                onClick={(event) => ui.onPlus(link, event.currentTarget)}
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            )}
          </Fragment>
        );
      })}
    </ViewportPortal>
  );
}

export interface EventGraphCanvasProps {
  character: Character;
  draft: EventDraft;
  graph: EventGraph;
  selectedId: string | null;
  /** Problems to show on nodes, by node id. */
  problems: Map<string, string[]>;
  /** Node to bring into view; `tick` changes with each request, and `roomAfter` also shows what follows the node. */
  reveal: { id: string; tick: number; roomAfter?: boolean } | null;
  /** Effects can be dragged onto a "+" to move them. */
  canDrag: boolean;
  onSelect: (nodeId: string | null) => void;
  onAddEffect: (slot: GraphSlot) => void;
  onAddCondition: (slot: GraphSlot) => void;
  onAddEnd: (slot: GraphSlot) => void;
  onMoveEffect: (effectId: string, slot: GraphSlot) => void;
  onRemoveEffect: (effectId: string) => void;
  /** A side of a condition carries on at any step, or at the end, instead of where its line goes on; `null` takes the jump away. */
  onSetJump: (stepId: string, section: BranchSection, target: string | null) => void;
}

const jumpKey = (nodeId: string, handle?: string | null) => `${nodeId}|${handle ?? ''}`;

function Canvas({ character, draft, graph, selectedId, problems, reveal, canDrag, onSelect, onAddEffect, onAddCondition, onAddEnd, onMoveEffect, onRemoveEffect, onSetJump }: EventGraphCanvasProps) {
  const flow = useReactFlow<FlowNode, FlowEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const down = graph.direction === 'down';
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLElement | null>(null);
  const dropRef = useRef<GraphEdge | null>(null);
  const [ready, setReady] = useState(false);
  // React Flow reports each node's size once; handing it back keeps the handles it measured.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; from: EffectLocation | null } | null>(null);
  const [dropEdgeId, setDropEdgeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ link: GraphEdge; left: number; top?: number; bottom?: number } | null>(null);
  // The side a link is being dragged from, to jump from it. Read from the store so it also holds in
  // click-to-connect mode, after the mouse is released. A string keeps the subscription stable.
  const connectingFrom = useStore((state) => {
    const { connection, connectionClickStartHandle: clicked } = state;
    if (connection.inProgress && connection.fromHandle?.type === 'source') return jumpKey(connection.fromNode.id, connection.fromHandle.id);
    return clicked?.type === 'source' ? jumpKey(clicked.nodeId, clicked.id) : null;
  });
  const jumpSources = useMemo(() => new Map(graph.jumpSources.map((source) => [jumpKey(source.nodeId, source.handle), source])), [graph.jumpSources]);
  const sourceOf = (nodeId: string | null | undefined, handle?: string | null) => (nodeId ? jumpSources.get(jumpKey(nodeId, handle)) : undefined);
  const jumping = connectingFrom ? jumpSources.get(connectingFrom) ?? null : null;
  const jumpTo = (source: GraphJumpSource | undefined, nodeId: string | null | undefined) => {
    const target = nodeId ? graph.jumpTargets[nodeId] : undefined;
    return source && nodeId && target && source.targets.includes(nodeId) ? target : undefined;
  };

  const nodes = useMemo<FlowNode[]>(() => graph.nodes.map((node) => {
    const dragged = drag?.id === node.id;
    const problem = problems.get(node.id)?.join('\n');
    const base = {
      id: node.id,
      type: node.kind,
      position: dragged ? { x: drag.x, y: drag.y } : { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      measured: measured[node.id],
      deletable: false,
    };
    const passive = { ...base, selectable: false, draggable: false, focusable: false, data: { graph: node, problem } };
    const card = (data: Omit<NodeData, 'graph' | 'problem'>): FlowNode => ({
      ...base,
      selected: node.id === selectedId,
      dragging: dragged,
      draggable: canDrag && node.kind === 'effect',
      zIndex: dragged ? 1000 : 0,
      ariaLabel: `${data.pill}: ${data.text}`,
      data: { graph: node, problem, ...data },
    });

    if (node.kind === 'trigger') {
      const { trigger } = draft;
      return card({
        pill: 'When',
        tone: 'when',
        icon: getEventIcon(trigger.kind, findWidget(character, trigger.widgetId)),
        text: trigger.kind ? describeTrigger(character, trigger) : 'Choose what sets this off',
        blank: !trigger.kind,
      });
    }
    if (node.kind === 'condition') {
      const formula = findStep(draft.steps, node.stepId)?.condition?.trim();
      return card({ pill: 'Only if', tone: 'if', icon: '🔀', text: formula || 'Write the condition', blank: !formula });
    }
    if (node.kind === 'effect') {
      const effect = node.effectId ? findEffect(draft.steps, node.effectId)?.effect : undefined;
      if (!effect) return passive;
      const otherwise = node.side === 'no';
      const target = node.branchStepId ? parseRollBranch(findStep(draft.steps, node.branchStepId)?.condition, effect.resultName)?.trim() : undefined;
      return card({
        pill: otherwise ? 'Else' : 'Then',
        tone: otherwise ? 'else' : 'then',
        icon: getEventIcon(effect.kind, findWidget(character, effect.widgetId)),
        text: effect.kind ? `${describeEffect(character, effect)}${target === undefined ? '' : ` · target ${target || '?'}`}` : 'Choose what this does',
        blank: !effect.kind,
      });
    }
    return passive;
  }), [canDrag, character, draft, drag, graph.nodes, measured, problems, selectedId]);

  const edges = useMemo<FlowEdge[]>(() => graph.edges.map((link) => ({
    id: link.id,
    type: 'link',
    source: link.source,
    target: link.target,
    sourceHandle: link.sourceHandle,
    targetHandle: link.targetHandle,
    selectable: false,
    focusable: false,
    deletable: false,
    data: { link },
  })), [graph.edges]);

  // The menu points at a link, so it goes when the links change.
  useEffect(() => setMenu(null), [graph]);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector('button')?.focus({ preventScroll: true });
    const closeOnOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || (!menuRef.current?.contains(event.target) && !event.target.closest('.event-link__add'))) setMenu(null);
    };
    document.addEventListener('pointerdown', closeOnOutside, true);
    return () => document.removeEventListener('pointerdown', closeOnOutside, true);
  }, [menu]);

  // Starts at a readable size with the trigger in view, rather than shrinking a long event to fit.
  const showStart = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { clientWidth: width, clientHeight: height } = wrapper;
    const left = Math.min(...graph.nodes.map((node) => node.x));
    const top = Math.min(...graph.nodes.map((node) => node.y));
    const right = Math.max(...graph.nodes.map((node) => node.x + node.width), ...graph.edges.map((link) => (link.plus ? link.plus.x + 14 : -Infinity)));
    const bottom = Math.max(...graph.nodes.map((node) => node.y + node.height));
    const fit = Math.min((width - VIEW_PADDING * 2) / (right - left), (height - VIEW_PADDING * 2) / (bottom - top));
    const zoom = Math.min(1, Math.max(MIN_START_ZOOM, fit));
    const fitsAcross = (right - left) * zoom <= width - VIEW_PADDING * 2;
    const fitsDown = (bottom - top) * zoom <= height - VIEW_PADDING * 2;
    flow.setViewport({
      x: fitsAcross ? width / 2 - ((left + right) / 2) * zoom : VIEW_PADDING - left * zoom,
      y: fitsDown ? height / 2 - ((top + bottom) / 2) * zoom : VIEW_PADDING - top * zoom,
      zoom,
    });
    setReady(true);
  };

  const revealTick = reveal?.tick;
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const node = reveal ? graph.nodes.find((item) => item.id === reveal.id) : undefined;
    if (!ready || !wrapper || !reveal || !node) return;
    const { x, y, zoom } = flow.getViewport();
    // Sized from the wrapper, which already has its new size when the settings panel has just opened over the graph.
    const { clientWidth: width, clientHeight: height } = wrapper;
    const margin = 16;
    // A node that was just added also shows what hangs after it, such as the "+" that continues the flow.
    const after = reveal.roomAfter ? (GRAPH_SIZES.gap + GRAPH_SIZES.addHeight) * zoom : 0;
    const endX = margin + (down ? 0 : after);
    const endY = margin + (down ? after : 0);
    const left = node.x * zoom + x;
    const top = node.y * zoom + y;
    const right = left + node.width * zoom;
    const bottom = top + node.height * zoom;
    // Moves the view by just what brings the node in, keeping its top left corner when it can't all fit.
    const shiftX = left < margin || right - left > width - margin - endX ? margin - left : right > width - endX ? width - endX - right : 0;
    const shiftY = top < margin || bottom - top > height - margin - endY ? margin - top : bottom > height - endY ? height - endY - bottom : 0;
    if (shiftX === 0 && shiftY === 0) return;
    flow.setViewport({ x: x + shiftX, y: y + shiftY, zoom }, { duration: prefersReducedMotion() ? 0 : 250, interpolate: 'linear' });
    // Only when asked: the graph changing under a node that was revealed earlier shouldn't move the view.
  }, [revealTick, ready]);

  // The editor grows in as it opens, and React Flow measures where links attach while it is still scaled down,
  // which leaves them a few pixels off: they are measured again once it has settled.
  useEffect(() => {
    const running: Animation[] = [];
    for (let element: Element | null = wrapperRef.current; element; element = element.parentElement) running.push(...element.getAnimations());
    if (running.length === 0) return;
    let stopped = false;
    void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (!stopped) updateNodeInternals(flow.getNodes().map((node) => node.id));
    });
    return () => {
      stopped = true;
    };
  }, [flow, updateNodeInternals]);

  // Turning the flow moves the points links attach to, which React Flow only measures again when told, and starts the view over.
  const shownDirection = useRef(graph.direction);
  useLayoutEffect(() => {
    if (!ready || shownDirection.current === graph.direction) return;
    shownDirection.current = graph.direction;
    updateNodeInternals(graph.nodes.map((node) => node.id));
    showStart();
  });

  // A roll that gains or loses its target number, or a side that gains or loses a place to jump from, gains or loses handles, which React Flow only measures again when told.
  const branchKey = graph.nodes.filter((node) => node.branchStepId).map((node) => node.id).join(',');
  const jumpKeys = graph.jumpSources.map((source) => jumpKey(source.nodeId, source.handle)).join(',');
  useLayoutEffect(() => {
    updateNodeInternals(graph.nodes.map((node) => node.id));
  }, [branchKey, jumpKeys]);

  // Keeps the graph in the middle when the room for it changes width, as when a phone is turned.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!ready || !wrapper) return;
    let width = wrapper.clientWidth;
    const observer = new ResizeObserver(() => {
      const change = wrapper.clientWidth - width;
      width = wrapper.clientWidth;
      if (change === 0) return;
      const { x, y, zoom } = flow.getViewport();
      flow.setViewport({ x: x + change / 2, y, zoom });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [flow, ready]);

  const handleNodesChange = (changes: NodeChange<FlowNode>[]) => {
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        const { id, dimensions } = change;
        setMeasured((current) => (
          current[id]?.width === dimensions.width && current[id]?.height === dimensions.height ? current : { ...current, [id]: dimensions }
        ));
      } else if (change.type === 'select' && change.selected) {
        onSelect(change.id);
      }
    }
  };

  const handleNodeDrag: OnNodeDrag<FlowNode> = (_event, node) => {
    const { effectId } = node.data.graph;
    if (!effectId) return;
    const from = drag?.id === node.id ? drag.from : findEffect(draft.steps, effectId);
    setDrag({ id: node.id, x: node.position.x, y: node.position.y, from });
    // Measured from where the node's link comes in, so the "+" it would take stays in sight ahead of it.
    const anchorX = node.position.x + (down ? GRAPH_SIZES.nodeWidth / 2 : 0);
    const anchorY = node.position.y + (down ? 0 : GRAPH_SIZES.nodeHeight / 2);
    let nearest: GraphEdge | null = null;
    let distance = DROP_RADIUS;
    for (const link of graph.edges) {
      if (!link.slot || !link.plus || (from && isSlotBeside(from, link.slot))) continue;
      const linkDistance = Math.hypot(link.plus.x - anchorX, link.plus.y - anchorY);
      if (linkDistance < distance) {
        nearest = link;
        distance = linkDistance;
      }
    }
    dropRef.current = nearest;
    setDropEdgeId(nearest?.id ?? null);
  };

  const handleNodeDragStop: OnNodeDrag<FlowNode> = (_event, node) => {
    const slot = dropRef.current?.slot;
    dropRef.current = null;
    setDropEdgeId(null);
    setDrag(null);
    if (slot && node.data.graph.effectId) onMoveEffect(node.data.graph.effectId, slot);
  };

  const handlePlus = (link: GraphEdge, button: HTMLElement) => {
    const wrapper = wrapperRef.current;
    if (!link.slot || !wrapper) return;
    if (menu?.link.id === link.id) {
      setMenu(null);
      return;
    }
    const bounds = wrapper.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const middle = rect.left + rect.width / 2 - bounds.left;
    const below = rect.bottom - bounds.top + 6;
    menuButtonRef.current = button;
    setMenu({
      link,
      left: Math.max(8, Math.min(middle - MENU_WIDTH / 2, bounds.width - MENU_WIDTH - 8)),
      // Opens upwards when there is no room under the "+".
      ...(below + MENU_HEIGHT > bounds.height ? { bottom: bounds.bottom - rect.top + 6 } : { top: below }),
    });
  };

  const addAt = (slot: GraphSlot, kind: AddKind) => {
    if (kind === 'effect') onAddEffect(slot);
    else if (kind === 'condition') onAddCondition(slot);
    else onAddEnd(slot);
  };

  const chooseFromMenu = (kind: AddKind) => {
    const slot = menu?.link.slot;
    setMenu(null);
    if (slot) addAt(slot, kind);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      // Escape only closes the menu, not the whole editor; Tab carries on from the "+" that opened it.
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
      setMenu(null);
      if (menuButtonRef.current?.isConnected) menuButtonRef.current.focus({ preventScroll: true });
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll('button'));
    const next = items.indexOf(document.activeElement as HTMLButtonElement) + (event.key === 'ArrowDown' ? 1 : -1);
    items[(next + items.length) % items.length]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.key !== 'Delete' && event.key !== 'Backspace') || !(event.target instanceof HTMLElement) || !event.target.classList.contains('react-flow__node')) return;
    const effectId = graph.nodes.find((node) => node.id === (event.target as HTMLElement).dataset.id)?.effectId;
    if (!effectId) return;
    event.preventDefault();
    onRemoveEffect(effectId);
  };

  const ui: GraphUi = {
    direction: graph.direction,
    nodes: graph.nodes,
    dropEdgeId,
    dragFrom: drag?.from ?? null,
    menuEdgeId: menu?.link.id ?? null,
    onPlus: handlePlus,
    onAdd: addAt,
    canJumpFrom: (nodeId, handle) => !!sourceOf(nodeId, handle),
    isJumpTarget: (nodeId) => !!jumping && !!jumpTo(jumping, nodeId),
    onRemoveJump: (link) => {
      const source = sourceOf(link.source, link.sourceHandle);
      if (source) onSetJump(source.stepId, source.section, null);
    },
  };

  const handleConnect = (connection: Connection) => {
    const source = sourceOf(connection.source, connection.sourceHandle);
    const target = jumpTo(source, connection.target);
    if (source && target) onSetJump(source.stepId, source.section, target);
  };

  return (
    <div ref={wrapperRef} data-touch-camera-own-pinch="true" className={`event-graph absolute inset-0 ${jumping ? 'event-graph--jumping' : ''} ${ready ? '' : 'opacity-0'}`}>
      <GraphUiContext.Provider value={ui}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={(_event, node) => node.selectable !== false && onSelect(node.id)}
          onNodeDragStart={() => setMenu(null)}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={() => {
            setMenu(null);
            onSelect(null);
          }}
          onMoveStart={() => setMenu(null)}
          onInit={showStart}
          onKeyDown={handleKeyDown}
          nodesDraggable={canDrag}
          nodesConnectable
          onConnect={handleConnect}
          isValidConnection={(connection) => !!jumpTo(sourceOf(connection.source, connection.sourceHandle), connection.target)}
          edgesFocusable={false}
          edgesReconnectable={false}
          selectNodesOnDrag={false}
          nodeDragThreshold={4}
          multiSelectionKeyCode={null}
          selectionKeyCode={null}
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          minZoom={0.2}
          maxZoom={1.5}
          ariaLabelConfig={ariaLabels}
          aria-label="Event flow"
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} fitViewOptions={{ padding: 0.1, maxZoom: 1 }} />
          <LinkControls graph={graph} />
        </ReactFlow>
      </GraphUiContext.Provider>
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Add to the event"
          className="event-graph__menu animate-dropdown-in"
          style={{ left: menu.left, top: menu.top, bottom: menu.bottom, width: MENU_WIDTH }}
          onKeyDown={handleMenuKeyDown}
        >
          <button type="button" role="menuitem" onClick={() => chooseFromMenu('effect')}>
            <span aria-hidden="true">⚡</span>
            <span><strong>Effect</strong><small>Do something</small></span>
          </button>
          <button type="button" role="menuitem" onClick={() => chooseFromMenu('condition')}>
            <span aria-hidden="true">🔀</span>
            <span><strong>Condition</strong><small>Only carry on if something is true</small></span>
          </button>
          <button type="button" role="menuitem" onClick={() => chooseFromMenu('end')}>
            <span aria-hidden="true">🏁</span>
            <span><strong>End</strong><small>Stop the event here</small></span>
          </button>
        </div>
      )}
    </div>
  );
}

/** An event drawn as a graph: the trigger, then conditions and effects joined by links that things can be added to. */
export function EventGraphCanvas(props: EventGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
