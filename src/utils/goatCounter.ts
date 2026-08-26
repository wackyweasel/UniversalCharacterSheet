export const trackGoatCounterEvent = (path: string) => {
  if (typeof window === 'undefined') return;

  window.goatcounter?.count({
    path,
    event: true,
    no_session: true,
  });
};