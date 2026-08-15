import type { CardTableBackDesign, CardTableCard } from '../../types';

export interface CardDeckRegistration {
  widgetId: string;
  element: HTMLElement;
  label: string;
  cards: CardTableCard[];
  backDesign: CardTableBackDesign;
  interactive: boolean;
  onFlip: (cardId: string) => void;
  onMove: (cardId: string, targetWidgetId: string) => void;
}

export interface CardDeckDragState {
  pointerId: number;
  sourceWidgetId: string;
  targetWidgetId: string | null;
  cardId: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  didMove: boolean;
  phase: 'pressing' | 'dragging' | 'settling';
  settleStartedAt: number;
  settleDuration: number;
  settleFromX: number;
  settleFromY: number;
  settleToX: number;
  settleToY: number;
}

export interface CardDeckGatherRequestEntry {
  card: CardTableCard;
  sourceWidgetId: string;
  backDesign: CardTableBackDesign;
}

export interface CardDeckGatherAnimationEntry extends CardDeckGatherRequestEntry {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  index: number;
}

export interface CardDeckGatherAnimationState {
  targetWidgetId: string;
  entries: CardDeckGatherAnimationEntry[];
  startedAt: number;
  duration: number;
}

const registrations = new Map<string, CardDeckRegistration>();
const subscribers = new Set<() => void>();
let version = 0;
let dragState: CardDeckDragState | null = null;
let dragElement: HTMLElement | null = null;
let removePointerListeners: (() => void) | null = null;
let settleTimeout: number | null = null;
let gatherAnimation: CardDeckGatherAnimationState | null = null;
let gatherTimeout: number | null = null;

const emit = () => {
  version += 1;
  subscribers.forEach((subscriber) => subscriber());
};

const clearTarget = () => {
  registrations.forEach((registration) => registration.element.classList.remove('card-deck-surface--drop-target'));
};

const clearPointerListeners = () => {
  removePointerListeners?.();
  removePointerListeners = null;
};

const finishSettlement = (source: CardDeckRegistration, targetWidgetId: string | null) => {
  const cardId = dragState?.cardId;
  clearTarget();
  dragState = null;
  settleTimeout = null;
  emit();
  if (cardId && targetWidgetId && targetWidgetId !== source.widgetId) source.onMove(cardId, targetWidgetId);
};

const settleDrag = (source: CardDeckRegistration, targetWidgetId: string | null) => {
  if (!dragState) return;
  const target = targetWidgetId ? registrations.get(targetWidgetId) : source;
  const targetRect = target?.element.getBoundingClientRect() ?? source.element.getBoundingClientRect();
  dragState = {
    ...dragState,
    targetWidgetId,
    phase: 'settling',
    settleStartedAt: performance.now(),
    settleDuration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260,
    settleFromX: dragState.x,
    settleFromY: dragState.y,
    settleToX: targetRect.left + targetRect.width / 2,
    settleToY: targetRect.top + targetRect.height / 2,
  };
  clearTarget();
  emit();
  if (dragState.settleDuration === 0) {
    finishSettlement(source, targetWidgetId);
    return;
  }
  settleTimeout = window.setTimeout(() => finishSettlement(source, targetWidgetId), dragState.settleDuration);
};

const resolveTarget = (clientX: number, clientY: number, sourceWidgetId: string): CardDeckRegistration | null => {
  const candidates = Array.from(registrations.values()).filter((registration) => {
    if (!registration.interactive || registration.widgetId === sourceWidgetId) return false;
    const rect = registration.element.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  });
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
};

const handlePointerMove = (event: PointerEvent) => {
  if (!dragState || event.pointerId !== dragState.pointerId || dragState.phase === 'settling') return;
  if (!dragState.didMove && Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) < 5) return;
  event.preventDefault();
  const target = resolveTarget(event.clientX, event.clientY, dragState.sourceWidgetId);
  clearTarget();
  target?.element.classList.add('card-deck-surface--drop-target');
  dragState = {
    ...dragState,
    didMove: true,
    phase: 'dragging',
    x: event.clientX,
    y: event.clientY,
    targetWidgetId: target?.widgetId ?? null,
  };
};

const handlePointerEnd = (event: PointerEvent, cancelled = false) => {
  const active = dragState;
  if (!active || event.pointerId !== active.pointerId || active.phase === 'settling') return;
  clearPointerListeners();
  if (dragElement?.hasPointerCapture(active.pointerId)) dragElement.releasePointerCapture(active.pointerId);
  dragElement = null;
  const source = registrations.get(active.sourceWidgetId);
  if (!source) {
    clearTarget();
    dragState = null;
    emit();
    return;
  }
  if (!active.didMove && !cancelled) {
    clearTarget();
    dragState = null;
    emit();
    source.onFlip(active.cardId);
    return;
  }
  settleDrag(source, cancelled ? null : active.targetWidgetId);
};

export const subscribeCardDeckRegistry = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

export const getCardDeckRegistryVersion = () => version;
export const getCardDeckRegistrations = () => Array.from(registrations.values());
export const getCardDeckDragState = () => dragState;
export const getCardDeckGatherAnimation = () => gatherAnimation;

export function startCardDeckGatherAnimation(
  targetWidgetId: string,
  entries: CardDeckGatherRequestEntry[],
) {
  const target = registrations.get(targetWidgetId);
  if (!target || entries.length === 0) return;
  if (gatherTimeout !== null) window.clearTimeout(gatherTimeout);
  const targetRect = target.element.getBoundingClientRect();
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;
  const animationEntries = entries.flatMap((entry, index) => {
    const source = registrations.get(entry.sourceWidgetId);
    if (!source) return [];
    const sourceRect = source.element.getBoundingClientRect();
    return [{
      ...entry,
      sourceX: sourceRect.left + sourceRect.width / 2,
      sourceY: sourceRect.top + sourceRect.height / 2,
      targetX,
      targetY,
      index,
    }];
  });
  if (animationEntries.length === 0) return;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
  gatherAnimation = {
    targetWidgetId,
    entries: animationEntries,
    startedAt: performance.now(),
    duration,
  };
  emit();
  if (duration === 0) {
    gatherAnimation = null;
    emit();
    return;
  }
  gatherTimeout = window.setTimeout(() => {
    gatherAnimation = null;
    gatherTimeout = null;
    emit();
  }, duration);
}

export function registerCardDeck(registration: CardDeckRegistration) {
  registrations.set(registration.widgetId, registration);
  emit();
  return () => {
    if (registrations.get(registration.widgetId)?.element !== registration.element) return;
    registrations.delete(registration.widgetId);
    if (dragState?.sourceWidgetId === registration.widgetId && settleTimeout === null) {
      clearPointerListeners();
      clearTarget();
      dragState = null;
      dragElement = null;
    }
    emit();
  };
}

export function startCardDeckDrag(widgetId: string, event: PointerEvent, element: HTMLElement) {
  const registration = registrations.get(widgetId);
  const card = registration?.cards[0];
  if (!registration?.interactive || !card || event.button !== 0 || dragState) return;
  event.preventDefault();
  event.stopPropagation();
  if (settleTimeout !== null) window.clearTimeout(settleTimeout);
  settleTimeout = null;
  const rect = registration.element.getBoundingClientRect();
  dragElement = element;
  element.setPointerCapture(event.pointerId);
  dragState = {
    pointerId: event.pointerId,
    sourceWidgetId: widgetId,
    targetWidgetId: null,
    cardId: card.id,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    startX: event.clientX,
    startY: event.clientY,
    didMove: false,
    phase: 'pressing',
    settleStartedAt: 0,
    settleDuration: 0,
    settleFromX: 0,
    settleFromY: 0,
    settleToX: 0,
    settleToY: 0,
  };
  const onMove = (pointerEvent: PointerEvent) => handlePointerMove(pointerEvent);
  const onUp = (pointerEvent: PointerEvent) => handlePointerEnd(pointerEvent);
  const onCancel = (pointerEvent: PointerEvent) => handlePointerEnd(pointerEvent, true);
  const onBlur = () => {
    if (dragState) handlePointerEnd(new PointerEvent('pointercancel', { pointerId: dragState.pointerId }), true);
  };
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('blur', onBlur);
  removePointerListeners = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('blur', onBlur);
  };
  emit();
}