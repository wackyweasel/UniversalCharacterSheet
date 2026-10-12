// A press that starts inside a dialog and is released on its backdrop makes the browser click the backdrop
// (their common ancestor). Ignore those clicks so backdrops only react to presses that started on them.
function isFullScreenOverlay(element: Element) {
  if (getComputedStyle(element).position !== 'fixed') return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= window.innerWidth - 1 && rect.height >= window.innerHeight - 1;
}

export function installPressStartClicks() {
  let pressTarget: EventTarget | null = null;

  document.addEventListener('pointerdown', (event) => {
    pressTarget = event.target;
  }, true);

  document.addEventListener('click', (event) => {
    const start = pressTarget;
    pressTarget = null;
    if (event.detail === 0 || !(start instanceof Node) || !(event.target instanceof Element)) return;
    if (start !== event.target && event.target.contains(start) && isFullScreenOverlay(event.target)) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
}
