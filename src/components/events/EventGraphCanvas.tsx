import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportPortal,
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
import {
  findEffect,
  GRAPH_SIZES,
  isSlotBeside,
  type EffectLocation,
  type EventGraph,
  type GraphEdge,
  type GraphNode,
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

interface GraphUi {
  /** Link whose "+" a dragged effect would drop on. */
  dropEdgeId: string | null;
  /** Where the effect being dragged comes from. */
  dragFrom: EffectLocation | null;
  menuEdgeId: string | null;
  onPlus: (link: GraphEdge, button: HTMLElement) => void;
  onAdd: (slot: GraphSlot) => void;
}

const GraphUiContext = createContext<GraphUi>({ dropEdgeId: null, dragFrom: null, menuEdgeId: null, onPlus: () => {}, onAdd: () => {} });

const CORNER = 12;
/** How close, in graph units, a dragged effect must be to a "+" to drop on it. */
const DROP_RADIUS = 90;
const MENU_WIDTH = 208;
const MENU_HEIGHT = 104;
const VIEW_PADDING = 24;
/** A long event opens no smaller than this, so its text stays readable; the rest is a pan away. */
const MIN_START_ZOOM = 0.85;

const isTrunkSlot = (slot: GraphSlot) => slot.kind === 'gap' || slot.trunk;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CardNode({ data }: NodeProps<FlowNode>) {
  const { graph, pill, tone, icon, text, blank, problem } = data;
  const isCondition = graph.kind === 'condition';
  return (
    <div
      className={`event-node event-node--${graph.kind} ${graph.section === 'otherwise' ? 'event-node--otherwise' : ''} ${problem ? 'event-node--problem' : ''}`}
      title={problem}
    >
      {graph.kind !== 'trigger' && <Handle type="target" position={Position.Top} isConnectable={false} />}
      <span className="event-node__icon" aria-hidden="true">{problem ? '⚠️' : icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`event-flow__pill event-flow__pill--${tone} event-node__pill`}>{pill}</span>
        <span className={`event-node__text ${blank ? 'event-node__text--blank' : isCondition ? 'event-node__text--formula' : ''}`}>{text}</span>
      </span>
      <Handle type="source" position={Position.Bottom} id={isCondition ? 'yes' : undefined} isConnectable={false} />
      {isCondition && <Handle type="source" position={Position.Right} id="no" isConnectable={false} />}
    </div>
  );
}

function AddNode({ data }: NodeProps<FlowNode>) {
  const ui = useContext(GraphUiContext);
  const { graph, problem } = data;
  return (
    <button
      type="button"
      className={`event-node-add nodrag nopan ${problem ? 'event-node-add--problem' : ''}`}
      title={problem}
      onClick={() => graph.slot && ui.onAdd(graph.slot)}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <PlusIcon className="h-3.5 w-3.5" /> Add an effect
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </button>
  );
}

function JoinNode() {
  return (
    <div className="event-node-join">
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} />
      <Handle type="target" position={Position.Right} id="side" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

function EndNode({ data }: NodeProps<FlowNode>) {
  const stops = data.graph.kind === 'stop';
  return (
    <div className={`event-node-end ${stops ? 'event-node-end--stop' : ''}`} title={stops ? 'The event stops here when the condition is false' : undefined}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {stops ? 'Stop' : 'End'}
    </div>
  );
}

const nodeTypes = { trigger: CardNode, condition: CardNode, effect: CardNode, add: AddNode, join: JoinNode, stop: EndNode, end: EndNode };

function linkPath(link: GraphEdge, sx: number, sy: number, tx: number, ty: number): string {
  if (link.shape === 'out') return `M ${sx} ${sy} H ${tx - CORNER} Q ${tx} ${sy} ${tx} ${sy + CORNER} V ${ty}`;
  if (link.shape === 'in') return `M ${sx} ${sy} V ${ty - CORNER} Q ${sx} ${ty} ${sx - CORNER} ${ty} H ${tx}`;
  if (link.shape === 'around') {
    const via = link.viaX ?? sx + CORNER * 2;
    return `M ${sx} ${sy} H ${via - CORNER} Q ${via} ${sy} ${via} ${sy + CORNER} V ${ty - CORNER} Q ${via} ${ty} ${via - CORNER} ${ty} H ${tx}`;
  }
  return `M ${sx} ${sy} L ${tx} ${ty}`;
}

function LinkEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<FlowEdge>) {
  const ui = useContext(GraphUiContext);
  const link = data?.link;
  if (!link) return null;
  return (
    <BaseEdge
      id={id}
      path={linkPath(link, sourceX, sourceY, targetX, targetY)}
      interactionWidth={0}
      className={`event-link ${link.otherwise ? 'event-link--otherwise' : ''} ${ui.dropEdgeId === id ? 'event-link--drop' : ''}`}
    />
  );
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
        const trunk = !!slot && isTrunkSlot(slot);
        const hint = trunk ? 'Add an effect or a condition here' : 'Add an effect here';
        return (
          <Fragment key={link.id}>
            {label && source && (
              <span
                className="event-link__label"
                style={{
                  transform: label === 'Yes'
                    ? `translate(${source.x + source.width / 2 + 8}px, ${source.y + source.height + 5}px)`
                    : `translate(${source.x + source.width + 8}px, ${source.y + source.height / 2 - 19}px)`,
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
                aria-label={hint}
                title={hint}
                aria-haspopup={trunk ? 'menu' : undefined}
                aria-expanded={trunk ? ui.menuEdgeId === link.id : undefined}
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
  /** Node to bring into view; `tick` changes with each request, and `roomBelow` also shows what follows the node. */
  reveal: { id: string; tick: number; roomBelow?: boolean } | null;
  /** Effects can be dragged onto a "+" to move them. */
  canDrag: boolean;
  onSelect: (nodeId: string | null) => void;
  onAddEffect: (slot: GraphSlot) => void;
  onAddCondition: (slot: GraphSlot) => void;
  onMoveEffect: (effectId: string, slot: GraphSlot) => void;
  onRemoveEffect: (effectId: string) => void;
}

function Canvas({ character, draft, graph, selectedId, problems, reveal, canDrag, onSelect, onAddEffect, onAddCondition, onMoveEffect, onRemoveEffect }: EventGraphCanvasProps) {
  const flow = useReactFlow<FlowNode, FlowEdge>();
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
      connectable: false,
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
      const formula = draft.steps.find((step) => step.id === node.stepId)?.condition?.trim();
      return card({ pill: 'Only if', tone: 'if', icon: '🔀', text: formula || 'Write the condition', blank: !formula });
    }
    if (node.kind === 'effect') {
      const effect = node.effectId ? findEffect(draft.steps, node.effectId)?.effect : undefined;
      if (!effect) return passive;
      const otherwise = node.section === 'otherwise';
      return card({
        pill: otherwise ? 'Else' : 'Then',
        tone: otherwise ? 'else' : 'then',
        icon: getEventIcon(effect.kind, findWidget(character, effect.widgetId)),
        text: effect.kind ? describeEffect(character, effect) : 'Choose what this does',
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
    // A node that was just added also shows what hangs under it, such as the "+" that continues the flow.
    const below = margin + (reveal.roomBelow ? (GRAPH_SIZES.gap + GRAPH_SIZES.addHeight) * zoom : 0);
    const left = node.x * zoom + x;
    const top = node.y * zoom + y;
    const right = left + node.width * zoom;
    const bottom = top + node.height * zoom;
    // Moves the view by just what brings the node in, keeping its top left corner when it can't all fit.
    const shiftX = left < margin || right - left > width - margin * 2 ? margin - left : right > width - margin ? width - margin - right : 0;
    const shiftY = top < margin || bottom - top > height - margin - below ? margin - top : bottom > height - below ? height - below - bottom : 0;
    if (shiftX === 0 && shiftY === 0) return;
    flow.setViewport({ x: x + shiftX, y: y + shiftY, zoom }, { duration: prefersReducedMotion() ? 0 : 250, interpolate: 'linear' });
    // Only when asked: the graph changing under a node that was revealed earlier shouldn't move the view.
  }, [revealTick, ready]);

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
    // Measured from the top of the node, where its link comes in, so the "+" it would take stays in sight above it.
    const anchorX = node.position.x + GRAPH_SIZES.nodeWidth / 2;
    const anchorY = node.position.y;
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
    if (!isTrunkSlot(link.slot)) {
      setMenu(null);
      onAddEffect(link.slot);
      return;
    }
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

  const chooseFromMenu = (kind: 'effect' | 'condition') => {
    const slot = menu?.link.slot;
    setMenu(null);
    if (!slot) return;
    if (kind === 'effect') onAddEffect(slot);
    else onAddCondition(slot);
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

  const ui: GraphUi = { dropEdgeId, dragFrom: drag?.from ?? null, menuEdgeId: menu?.link.id ?? null, onPlus: handlePlus, onAdd: onAddEffect };

  return (
    <div ref={wrapperRef} data-touch-camera-own-pinch="true" className={`event-graph absolute inset-0 ${ready ? '' : 'opacity-0'}`}>
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
          nodesConnectable={false}
          edgesFocusable={false}
          edgesReconnectable={false}
          selectNodesOnDrag={false}
          nodeDragThreshold={4}
          multiSelectionKeyCode={null}
          selectionKeyCode={null}
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          minZoom={0.35}
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
