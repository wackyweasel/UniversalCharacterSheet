import type { CardTableBackDesign, CardTableCard } from '../../types';

export interface CardDeckRegistration {
  widgetId: string;
  element: HTMLElement;
  discardElement: HTMLElement | null;
  label: string;
  cards: CardTableCard[];
  backDesign: CardTableBackDesign;
  interactive: boolean;
  onFlip: (cardId: string) => void;
  onMove: (cardId: string, targetWidgetId: string) => void;
  onDiscard: (cardId: string, targetWidgetId: string) => void;
  onMoveAll?: (targetWidgetId: string) => void;
  onDiscardAll?: (targetWidgetId: string) => void;
}

export interface CardDeckDragState {
  pointerId: number;
  sourceWidgetId: string;
  targetWidgetId: string | null;
  targetKind: 'deck' | 'discard' | null;
  cardId: string;
  allCards: boolean;
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

export interface CardDeckShuffleAnimationState {
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
const shuffleAnimations = new Map<string, CardDeckShuffleAnimationState>();
const shuffleTimeouts = new Map<string, number>();

const emit = () => {
  version += 1;
  subscribers.forEach((subscriber) => subscriber());
};

const clearTarget = () => {
  registrations.forEach((registration) => {
    registration.element.classList.remove('card-deck-surface--drop-target');
    registration.discardElement?.classList.remove('card-deck-discard--drop-target');
  });
};

const clearPointerListeners = () => {
  removePointerListeners?.();
  removePointerListeners = null;
};

const finishSettlement = (source: CardDeckRegistration, targetWidgetId: string | null, targetKind: CardDeckDragState['targetKind']) => {
  const cardId = dragState?.cardId;
  const allCards = dragState?.allCards ?? false;
  clearTarget();
  dragState = null;
  settleTimeout = null;
  emit();
  if (!cardId || !targetWidgetId) return;
  if (targetKind === 'discard') {
    if (allCards) source.onDiscardAll?.(targetWidgetId);
    else source.onDiscard(cardId, targetWidgetId);
  } else if (targetWidgetId !== source.widgetId) {
    if (allCards) source.onMoveAll?.(targetWidgetId);
    else source.onMove(cardId, targetWidgetId);
  }
};

const settleDrag = (source: CardDeckRegistration, targetWidgetId: string | null, targetKind: CardDeckDragState['targetKind']) => {
  if (!dragState) return;
  const target = targetWidgetId ? registrations.get(targetWidgetId) : source;
  const targetElement = targetKind === 'discard' ? target?.discardElement : target?.element;
  const targetRect = targetElement?.getBoundingClientRect() ?? source.element.getBoundingClientRect();
  dragState = {
    ...dragState,
    targetWidgetId,
    targetKind,
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
    finishSettlement(source, targetWidgetId, targetKind);
    return;
  }
  settleTimeout = window.setTimeout(() => finishSettlement(source, targetWidgetId, targetKind), dragState.settleDuration);
};

const containsPoint = (element: HTMLElement, clientX: number, clientY: number) => {
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
};

const resolveTarget = (clientX: number, clientY: number, sourceWidgetId: string) => {
  const registrationsList = Array.from(registrations.values());
  const discardCandidates = registrationsList.filter((registration) => (
    registration.interactive && registration.discardElement && containsPoint(registration.discardElement, clientX, clientY)
  ));
  if (discardCandidates.length > 0) return { registration: discardCandidates[discardCandidates.length - 1], kind: 'discard' as const };
  const deckCandidates = registrationsList.filter((registration) => {
    if (!registration.interactive || registration.widgetId === sourceWidgetId) return false;
    const rect = registration.element.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  });
  return deckCandidates.length > 0 ? { registration: deckCandidates[deckCandidates.length - 1], kind: 'deck' as const } : null;
};

const handlePointerMove = (event: PointerEvent) => {
  if (!dragState || event.pointerId !== dragState.pointerId || dragState.phase === 'settling') return;
  if (!dragState.didMove && Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) < 5) return;
  event.preventDefault();
  const target = resolveTarget(event.clientX, event.clientY, dragState.sourceWidgetId);
  clearTarget();
  if (target?.kind === 'discard') target.registration.discardElement?.classList.add('card-deck-discard--drop-target');
  else target?.registration.element.classList.add('card-deck-surface--drop-target');
  dragState = {
    ...dragState,
    didMove: true,
    phase: 'dragging',
    x: event.clientX,
    y: event.clientY,
    targetWidgetId: target?.registration.widgetId ?? null,
    targetKind: target?.kind ?? null,
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
  settleDrag(source, cancelled ? null : active.targetWidgetId, cancelled ? null : active.targetKind);
};

export const subscribeCardDeckRegistry = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

export const getCardDeckRegistryVersion = () => version;
export const getCardDeckRegistrations = () => Array.from(registrations.values());
export const getCardDeckDragState = () => dragState;
export const getCardDeckGatherAnimation = () => gatherAnimation;
export const getCardDeckShuffleAnimation = (widgetId: string) => shuffleAnimations.get(widgetId) ?? null;

export function startCardDeckShuffleAnimation(widgetId: string) {
  const registration = registrations.get(widgetId);
  if (!registration || registration.cards.length < 2) return;
  const existingTimeout = shuffleTimeouts.get(widgetId);
  if (existingTimeout !== undefined) window.clearTimeout(existingTimeout);
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620;
  if (duration === 0) {
    shuffleAnimations.delete(widgetId);
    shuffleTimeouts.delete(widgetId);
    return;
  }
  shuffleAnimations.set(widgetId, { startedAt: performance.now(), duration });
  emit();
  const timeout = window.setTimeout(() => {
    shuffleAnimations.delete(widgetId);
    shuffleTimeouts.delete(widgetId);
    emit();
  }, duration);
  shuffleTimeouts.set(widgetId, timeout);
}

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

export function startCardDeckDrag(widgetId: string, event: PointerEvent, element: HTMLElement, allCards = false) {
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
    targetKind: null,
    cardId: card.id,
    allCards,
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