import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, DiceGroup, PoolResource, PoolRestoreTarget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { XIcon } from '../icons';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Modal component for pass time prompt
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

interface RestPlan {
  heal: boolean;
  poolRestores: PoolRestoreTarget[];
  clearConditions: boolean;
  resetSpellSlots: boolean;
  passTime: boolean;
  timeAmount: number;
  timeUnit: string;
}

interface AvailablePoolRestore {
  target: PoolRestoreTarget;
  label: string;
}

const matchesPoolRestore = (restore: PoolRestoreTarget, target: PoolRestoreTarget) => (
  restore.widgetId === target.widgetId
  && (restore.resourceIndex === target.resourceIndex || (target.resourceIndex === 0 && restore.resourceIndex === -1))
);

function Modal({ title, onClose, children }: ModalProps) {
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-theme-paper border border-theme-border rounded-button shadow-xl p-4 min-w-[280px] max-w-[440px] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-theme-ink font-heading">{title}</h3>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-1 text-theme-muted hover:text-theme-ink"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Parse time input to seconds
function parseTimeToSeconds(value: number, unit: string): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours': return value * 60 * 60;
    case 'days': return value * 24 * 60 * 60;
    case 'months': return value * 30 * 24 * 60 * 60;
    case 'years': return value * 365 * 24 * 60 * 60;
    default: return value;
  }
}

// Roll dice helper function
function rollDice(diceGroups: DiceGroup[]): number {
  let total = 0;
  for (const group of diceGroups) {
    for (let i = 0; i < group.count; i++) {
      total += Math.floor(Math.random() * group.faces) + 1;
    }
  }
  return total;
}

// Format dice groups for display
function formatDiceGroups(diceGroups: DiceGroup[]): string {
  return diceGroups.map(g => `${g.count}d${g.faces}`).join(' + ');
}

export default function RestButtonWidget({ widget }: Props) {
  const performRest = useStore((state) => state.performRest);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [restPlan, setRestPlan] = useState<RestPlan | null>(null);
  
  const { 
    buttonText = 'Rest',
    healToFull = false,
    healRandomDice = [],
    healFlatAmount = 0,
    poolRestores = [],
    clearConditions = false,
    resetSpellSlots = false,
    passTime = false,
    passTimeAmount = 0,
    passTimeUnit = 'hours'
  } = widget.data;

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === activeCharacterId),
    [characters, activeCharacterId]
  );
  const activeSheet = activeCharacter?.sheets.find((sheet) => sheet.id === activeCharacter.activeSheetId);
  const activeWidgets = activeSheet?.widgets ?? [];
  const availablePoolRestores = useMemo<AvailablePoolRestore[]>(() => {
    if (!activeCharacter) return [];

    return activeCharacter.sheets.flatMap((sheet) => sheet.widgets.flatMap((poolWidget) => {
      if (poolWidget.type !== 'POOL') return [];

      const widgetLabel = poolWidget.data.label || 'Resource Pool';
      const resources = (poolWidget.data.poolResources || []) as PoolResource[];
      if (resources.length > 0) {
        return resources.flatMap((resource, resourceIndex) => (
          resource.currentFormula
            ? []
            : [{
              target: { widgetId: poolWidget.id, resourceIndex, mode: 'full' },
              label: resource.name ? `${widgetLabel}: ${resource.name}` : `${widgetLabel} #${resourceIndex + 1}`,
            }]
        ));
      }

      const fieldFormulas = poolWidget.data.fieldFormulas as Record<string, string> | undefined;
      return fieldFormulas?.currentPool
        ? []
        : [{
          target: { widgetId: poolWidget.id, resourceIndex: -1, mode: 'full' },
          label: widgetLabel,
        }];
    }));
  }, [activeCharacter]);

  const hasConfiguredHealing = healToFull || healRandomDice.length > 0 || (healFlatAmount ?? 0) > 0;
  const hasHealthBar = activeWidgets.some((activeWidget) => activeWidget.type === 'HEALTH_BAR');
  const hasConditionWidget = activeWidgets.some((activeWidget) => activeWidget.type === 'TOGGLE_GROUP');
  const hasSpellSlotWidget = activeWidgets.some((activeWidget) => activeWidget.type === 'SPELL_SLOT');
  const hasTimeTracker = activeWidgets.some((activeWidget) => activeWidget.type === 'TIME_TRACKER');

  // Check if any action is enabled
  const hasAnyAction = hasConfiguredHealing || poolRestores.length > 0 || clearConditions || resetSpellSlots || passTime;
  const canPlanRest = hasAnyAction || hasHealthBar || availablePoolRestores.length > 0 || hasConditionWidget || hasSpellSlotWidget || hasTimeTracker;

  const executeRest = (plan: RestPlan) => {
    setIsAnimating(true);

    // Calculate random heal amount if needed
    let healAmount: number | 'full' | undefined = undefined;
    let resultMessage = '';

    if (plan.heal && (healToFull || !hasConfiguredHealing)) {
      healAmount = 'full';
      resultMessage = 'Healed to full!';
    } else if (plan.heal && healRandomDice.length > 0) {
      const rolled = rollDice(healRandomDice);
      healAmount = rolled + (healFlatAmount ?? 0);
      resultMessage = `Healed ${healAmount} HP (${formatDiceGroups(healRandomDice)}${healFlatAmount ? ` + ${healFlatAmount}` : ''})`;
    } else if (plan.heal && healFlatAmount && healFlatAmount > 0) {
      healAmount = healFlatAmount;
      resultMessage = `Healed ${healAmount} HP`;
    }

    const passTimeSeconds = plan.passTime
      ? parseTimeToSeconds(plan.timeAmount, plan.timeUnit)
      : undefined;
    
    // Build result message parts
    const actions: string[] = [];
    if (healAmount !== undefined) {
      actions.push(resultMessage);
    }
    if (plan.poolRestores.length > 0) {
      actions.push(`${plan.poolRestores.length} pool${plan.poolRestores.length > 1 ? 's' : ''} restored`);
    }
    if (plan.clearConditions) {
      actions.push('Conditions cleared');
    }
    if (plan.resetSpellSlots) {
      actions.push('Spell slots reset');
    }
    if (passTimeSeconds !== undefined && passTimeSeconds > 0) {
      actions.push('Time passed');
    }
    
    setLastResult(actions.join(' • '));
    
    // Perform the rest action
    performRest({
      healAmount,
      poolRestores: plan.poolRestores.length > 0 ? plan.poolRestores : undefined,
      clearConditions: plan.clearConditions,
      resetSpellSlots: plan.resetSpellSlots,
      passTimeSeconds
    });

    // Timeline event
    addTimelineEvent(buttonText || 'Rest', 'REST_BUTTON', actions.join(' \u2022 ') || 'Rest activated', '\ud83d\udca4');
    
    // Clear animation after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
    
    // Clear result message after a longer delay
    setTimeout(() => {
      setLastResult(null);
    }, 3000);
  };

  const handleRest = () => {
    if (!canPlanRest) return;
    setRestPlan({
      heal: hasConfiguredHealing,
      poolRestores: [...poolRestores],
      clearConditions,
      resetSpellSlots,
      passTime,
      timeAmount: passTimeAmount > 0 ? passTimeAmount : 1,
      timeUnit: passTimeUnit,
    });
  };

  // Build descriptive tooltip from all configured actions
  const restTooltip = (() => {
    if (!hasAnyAction) return 'Choose actions for this rest';
    const parts: string[] = [];
    if (healToFull) {
      parts.push('Heal to full HP');
    } else if (healRandomDice.length > 0) {
      const diceStr = formatDiceGroups(healRandomDice);
      parts.push(`Heal ${diceStr}${healFlatAmount ? ` + ${healFlatAmount}` : ''} HP`);
    } else if ((healFlatAmount ?? 0) > 0) {
      parts.push(`Heal ${healFlatAmount} HP`);
    }
    if (poolRestores.length > 0) {
      parts.push(`Restore ${poolRestores.length} resource pool${poolRestores.length > 1 ? 's' : ''}`);
    }
    if (clearConditions) parts.push('Clear conditions');
    if (resetSpellSlots) parts.push('Reset spell slots');
    if (passTime) {
      parts.push(passTimeAmount > 0 ? `Pass ${passTimeAmount} ${passTimeUnit}` : 'Pass time (you will be prompted)');
    }
    return parts.join(' • ') || 'Choose actions for this rest';
  })();

  return (
    <div className="flex flex-col gap-1 w-full h-full items-center justify-center p-1">
      {canPlanRest ? (
        <Tooltip content={restTooltip}>
          <button
            onClick={handleRest}
            onMouseDown={(e) => e.stopPropagation()}
            className={`widget-control widget-control--primary w-full h-full min-w-0 px-3 py-2 font-bold text-xs shadow-theme truncate ${isAnimating ? 'scale-95' : ''}`}
          >
            {buttonText}
          </button>
        </Tooltip>
      ) : (
        <WidgetEmptyState title="Rest is not configured" hint="Choose what this button restores in Build." />
      )}
      
      {/* Result message */}
      {lastResult && (
        <div className="absolute -bottom-5 left-0 right-0 text-[10px] text-theme-accent font-bold text-center font-body animate-pulse whitespace-nowrap">
          {lastResult}
        </div>
      )}

      {restPlan && (
        <Modal title={buttonText || 'Rest'} onClose={() => setRestPlan(null)}>
          <div className="space-y-3">
            <p className="text-theme-muted text-sm">Choose the effects to apply for this rest.</p>

            <div className="space-y-2">
              {(hasConfiguredHealing || hasHealthBar) && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restPlan.heal}
                    onChange={(e) => setRestPlan({ ...restPlan, heal: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-theme-accent"
                  />
                  <span className="text-sm text-theme-ink">
                    {healToFull || !hasConfiguredHealing
                      ? 'Heal to full HP'
                      : `Heal ${healRandomDice.length > 0 ? `${formatDiceGroups(healRandomDice)}${healFlatAmount ? ` + ${healFlatAmount}` : ''}` : healFlatAmount} HP`}
                  </span>
                </label>
              )}

              {availablePoolRestores.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-theme-muted uppercase">Resource Pools</div>
                  {availablePoolRestores.map(({ target, label }) => {
                    const restore = restPlan.poolRestores.find((candidate) => matchesPoolRestore(candidate, target));
                    return (
                      <label key={`${target.widgetId}:${target.resourceIndex}`} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(restore)}
                          onChange={(e) => setRestPlan({
                            ...restPlan,
                            poolRestores: e.target.checked
                              ? [...restPlan.poolRestores.filter((candidate) => !matchesPoolRestore(candidate, target)), { ...target }]
                              : restPlan.poolRestores.filter((candidate) => !matchesPoolRestore(candidate, target)),
                          })}
                          className="mt-0.5 w-4 h-4 accent-theme-accent"
                        />
                        <span className="min-w-0 text-sm text-theme-ink truncate" title={label}>
                          {label}{restore?.mode === 'flat' ? ` (+${restore.amount ?? 0})` : restore ? ' (full)' : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {(clearConditions || hasConditionWidget) && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restPlan.clearConditions}
                    onChange={(e) => setRestPlan({ ...restPlan, clearConditions: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-theme-accent"
                  />
                  <span className="text-sm text-theme-ink">Clear all conditions</span>
                </label>
              )}

              {(resetSpellSlots || hasSpellSlotWidget) && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restPlan.resetSpellSlots}
                    onChange={(e) => setRestPlan({ ...restPlan, resetSpellSlots: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-theme-accent"
                  />
                  <span className="text-sm text-theme-ink">Reset spell slots</span>
                </label>
              )}

              {(passTime || hasTimeTracker) && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={restPlan.passTime}
                    onChange={(e) => setRestPlan({ ...restPlan, passTime: e.target.checked })}
                    className="w-4 h-4 accent-theme-accent"
                    aria-label="Pass time"
                  />
                  <span className="text-sm text-theme-ink whitespace-nowrap">Pass</span>
                  <input
                    type="number"
                    min="1"
                    value={restPlan.timeAmount}
                    disabled={!restPlan.passTime}
                    onChange={(e) => setRestPlan({ ...restPlan, timeAmount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 border border-theme-border focus:border-theme-accent focus:outline-none py-1 px-2 bg-theme-paper text-theme-ink font-body rounded-button text-center disabled:opacity-50"
                  />
                  <select
                    value={restPlan.timeUnit}
                    disabled={!restPlan.passTime}
                    onChange={(e) => setRestPlan({ ...restPlan, timeUnit: e.target.value })}
                    className="min-w-0 flex-1 border border-theme-border focus:border-theme-accent focus:outline-none py-1 px-2 bg-theme-paper text-theme-ink font-body rounded-button disabled:opacity-50"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  executeRest(restPlan);
                  setRestPlan(null);
                }}
                className="flex-1 py-2 px-4 bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-colors font-bold"
              >
                Apply Rest
              </button>
              <button
                onClick={() => setRestPlan(null)}
                className="flex-1 py-2 px-4 border border-theme-border text-theme-muted rounded-button hover:bg-theme-border hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}






