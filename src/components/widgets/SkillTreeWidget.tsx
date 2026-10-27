import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import { CheckIcon, XIcon } from '../icons';
import type { SkillTreeNode, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { isFormulaBroken } from '../../utils/formulaEngine';
import {
  SKILL_NODE_HEIGHT,
  SKILL_NODE_WIDTH,
  describeMissingRequirements,
  getAllRequiredIds,
  getSkillConnectorPath,
  getSkillNodeStatus,
  getSpentPoints,
  getUnlockedDependents,
  isSkillTreeUsingPoints,
  layoutSkillTree,
  normalizeSkillCost,
  normalizeSkillPoints,
  type SkillNodeStatus,
} from '../../utils/skillTree';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const NODE_STATUS_CLASS: Record<SkillNodeStatus, string> = {
  unlocked: 'skill-tree__node--unlocked',
  available: 'skill-tree__node--available',
  unaffordable: 'skill-tree__node--unaffordable',
  locked: 'skill-tree__node--locked',
};

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

function pluralPoints(count: number): string {
  return `${count} ${count === 1 ? 'point' : 'points'}`;
}

export default function SkillTreeWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, fillColor } = widget.data;
  const nodes = useMemo(() => widget.data.skillNodes ?? [], [widget.data.skillNodes]);
  const orientation = widget.data.skillTreeOrientation ?? 'horizontal';
  const usePoints = isSkillTreeUsingPoints(widget.data);
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  const pointsFormula = fieldFormulas?.currentValue;
  const labels = useFormulaLabels(!!pointsFormula);
  const pointsBroken = !!pointsFormula && isFormulaBroken(pointsFormula, labels);

  const totalPoints = normalizeSkillPoints(widget.data.currentValue);
  const spentPoints = getSpentPoints(nodes);
  const pointsLeft = totalPoints - spentPoints;
  const unlockedCount = nodes.filter((node) => node.unlocked).length;
  const canEdit = interactive && mode === 'play';
  const canChangePoints = canEdit && usePoints && !pointsFormula;
  const timelineLabel = label || 'Skill tree';

  const layout = useMemo(() => layoutSkillTree(nodes, orientation), [nodes, orientation]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  // Touch has no hover, so a tap selects a skill and shows its details with the action button.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pointerTypeRef = useRef('mouse');
  const selectedNode = canEdit && selectedId ? byId.get(selectedId) : undefined;

  const getHint = (node: SkillTreeNode, status: SkillNodeStatus, withAction = true): string => {
    const cost = normalizeSkillCost(node.cost);
    if (status === 'unlocked') {
      const dependents = getUnlockedDependents(nodes, node.id);
      if (dependents.length > 0) return `Needed by ${dependents.map((item) => item.name || 'a skill').join(', ')}`;
      if (!withAction) return 'Unlocked';
      return usePoints && cost > 0 ? `Unlocked. Click to refund ${pluralPoints(cost)}.` : 'Unlocked. Click to lock it again.';
    }
    if (status === 'locked') return `Requires ${describeMissingRequirements(nodes, node)}`;
    if (status === 'unaffordable') return `Costs ${pluralPoints(cost)}; ${pointsLeft} left.`;
    if (!withAction) return usePoints && cost > 0 ? `Costs ${pluralPoints(cost)}` : '';
    return usePoints && cost > 0 ? `Click to unlock for ${pluralPoints(cost)}.` : 'Click to unlock.';
  };

  const toggleNode = (node: SkillTreeNode) => {
    if (!canEdit) return;
    const status = getSkillNodeStatus(nodes, node, pointsLeft, usePoints);
    const cost = normalizeSkillCost(node.cost);
    const name = node.name || 'Skill';

    if (status === 'unlocked') {
      if (getUnlockedDependents(nodes, node.id).length > 0) return;
      updateWidgetData(widget.id, { skillNodes: nodes.map((item) => (item.id === node.id ? { ...item, unlocked: false } : item)) });
      const refund = usePoints && cost > 0 ? ` (+${pluralPoints(cost)}, ${pointsLeft + cost} left)` : '';
      addTimelineEvent(timelineLabel, 'SKILL_TREE', `Refunded ${name}${refund}`, '↩️');
      return;
    }
    if (status !== 'available') return;
    updateWidgetData(widget.id, { skillNodes: nodes.map((item) => (item.id === node.id ? { ...item, unlocked: true } : item)) });
    const spend = usePoints && cost > 0 ? ` (-${pluralPoints(cost)}, ${pointsLeft - cost} left)` : '';
    addTimelineEvent(timelineLabel, 'SKILL_TREE', `Unlocked ${name}${spend}`, '🌟');
  };

  const changePoints = (delta: number) => {
    if (!canChangePoints) return;
    const next = Math.max(spentPoints, totalPoints + delta);
    if (next === totalPoints) return;
    updateWidgetData(widget.id, { currentValue: next });
    addTimelineEvent(timelineLabel, 'SKILL_TREE', `Skill points: ${totalPoints} → ${next} (${next - spentPoints} left)`, delta > 0 ? '➕' : '➖');
  };

  const header = (label || usePoints || nodes.length > 0) && (
    <div className="widget-header flex-shrink-0">
      {label && (
        <div className="widget-header-title min-w-0 flex-1 truncate">
          <InlineFormulaText text={label} />
        </div>
      )}
      <div className="skill-tree__points ml-auto" data-touch-camera-ignore="true">
        {canChangePoints && (
          <button
            type="button"
            aria-label="Remove a skill point"
            disabled={totalPoints <= spentPoints}
            className="widget-control h-5 min-h-0 w-5 flex-shrink-0 text-xs font-bold"
            onMouseDown={stopPropagation}
            onClick={(event) => {
              event.stopPropagation();
              changePoints(-1);
            }}
          >
            −
          </button>
        )}
        {usePoints ? (
          <span className={`skill-tree__points-value ${pointsLeft < 0 ? 'skill-tree__points-value--over' : ''}`} title={pointsBroken ? `Broken formula: ${pointsFormula}` : undefined}>
            {pointsBroken && <span className="mr-0.5 text-[9px] text-red-500">⚠</span>}
            <strong>{pointsLeft}</strong>
            <span>/{totalPoints} pts</span>
          </span>
        ) : (
          <span className="skill-tree__points-value">
            <strong>{unlockedCount}</strong>
            <span>/{nodes.length} unlocked</span>
          </span>
        )}
        {canChangePoints && (
          <button
            type="button"
            aria-label="Add a skill point"
            className="widget-control h-5 min-h-0 w-5 flex-shrink-0 text-xs font-bold"
            onMouseDown={stopPropagation}
            onClick={(event) => {
              event.stopPropagation();
              changePoints(1);
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );

  if (nodes.length === 0) {
    return (
      <div className="skill-tree-widget flex h-full w-full flex-col gap-1.5 font-body">
        {header}
        <WidgetEmptyState title="No skills" hint={canEdit ? 'Add skills in the widget editor.' : undefined} />
      </div>
    );
  }

  return (
    <div className="skill-tree-widget flex h-full w-full flex-col gap-1.5 font-body">
      {header}

      <div className="skill-tree__scroll min-h-0 flex-1">
        <div
          className="skill-tree__canvas"
          style={{ width: layout.width, height: layout.height, ...(fillColor ? { '--skill-color': fillColor } : {}) } as CSSProperties}
        >
          <svg className="skill-tree__links" width={layout.width} height={layout.height} aria-hidden="true">
            {nodes.flatMap((node) => {
              const to = layout.positions.get(node.id);
              return getAllRequiredIds(node).map((requiredId) => {
                const prerequisite = byId.get(requiredId);
                const from = layout.positions.get(requiredId);
                if (!to || !from || !prerequisite || requiredId === node.id) return null;
                const state = prerequisite.unlocked && node.unlocked
                  ? 'skill-tree__link--active'
                  : prerequisite.unlocked ? 'skill-tree__link--ready' : '';
                return <path key={`${requiredId}-${node.id}`} className={`skill-tree__link ${state}`} d={getSkillConnectorPath(from, to, orientation)} />;
              });
            })}
          </svg>

          {nodes.map((node) => {
            const position = layout.positions.get(node.id);
            if (!position) return null;
            const status = getSkillNodeStatus(nodes, node, pointsLeft, usePoints);
            const cost = normalizeSkillCost(node.cost);
            const blocked = status === 'unlocked' && getUnlockedDependents(nodes, node.id).length > 0;
            const actionable = canEdit && (status === 'available' || (status === 'unlocked' && !blocked));
            const name = node.name || 'Skill';
            const style = {
              left: position.x,
              top: position.y,
              width: SKILL_NODE_WIDTH,
              height: SKILL_NODE_HEIGHT,
            } as CSSProperties;
            const className = `skill-tree__node ${NODE_STATUS_CLASS[status]} ${actionable ? 'skill-tree__node--actionable' : ''} ${selectedNode?.id === node.id ? 'skill-tree__node--selected' : ''}`;
            const content = (
              <>
                <span className="skill-tree__node-name"><InlineFormulaText text={name} /></span>
                {status === 'unlocked' ? (
                  <span className="skill-tree__badge skill-tree__badge--check"><CheckIcon className="h-2.5 w-2.5" /></span>
                ) : usePoints && cost > 0 ? (
                  <span className="skill-tree__badge">{cost}</span>
                ) : null}
              </>
            );

            if (!canEdit) {
              return <div key={node.id} className={className} style={style} aria-label={`${name}: ${status}`}>{content}</div>;
            }
            return (
              <Tooltip key={node.id} content={`${name}${node.description ? `\n${node.description}` : ''}\n${getHint(node, status)}`}>
                <button
                  type="button"
                  className={className}
                  style={style}
                  aria-pressed={node.unlocked}
                  aria-disabled={!actionable}
                  aria-label={`${name}. ${getHint(node, status)}`}
                  onMouseDown={stopPropagation}
                  onPointerDown={(event) => {
                    pointerTypeRef.current = event.pointerType;
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (pointerTypeRef.current === 'touch' && event.detail !== 0) {
                      setSelectedId((current) => (current === node.id ? null : node.id));
                      return;
                    }
                    toggleNode(node);
                  }}
                >
                  {content}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {selectedNode && (() => {
        const status = getSkillNodeStatus(nodes, selectedNode, pointsLeft, usePoints);
        const hint = getHint(selectedNode, status, false);
        const actionable = status === 'available' || (status === 'unlocked' && getUnlockedDependents(nodes, selectedNode.id).length === 0);
        return (
          <div className="skill-tree__details" data-touch-camera-ignore="true" onMouseDown={stopPropagation}>
            <div className="min-w-0 flex-1">
              <div className="skill-tree__details-name"><InlineFormulaText text={selectedNode.name || 'Skill'} /></div>
              {selectedNode.description && <div className="skill-tree__details-text"><InlineFormulaText text={selectedNode.description} /></div>}
              {hint && <div className="skill-tree__details-hint">{hint}</div>}
            </div>
            {actionable && (
              <button
                type="button"
                className="widget-control widget-control--primary h-8 min-h-0 flex-shrink-0 px-3 text-xs font-semibold"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleNode(selectedNode);
                }}
              >
                {status === 'unlocked' ? 'Refund' : 'Unlock'}
              </button>
            )}
            <button
              type="button"
              aria-label="Close skill details"
              className="widget-control h-8 min-h-0 w-8 flex-shrink-0"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(null);
              }}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
