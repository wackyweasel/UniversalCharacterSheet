import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  getCardDeckRegistrations,
  getCardDeckRegistryVersion,
  subscribeCardDeckRegistry,
} from './cardDeckRegistry';

export default function CardDeckLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const version = useSyncExternalStore(
    subscribeCardDeckRegistry,
    getCardDeckRegistryVersion,
    getCardDeckRegistryVersion,
  );
  const hasDecks = getCardDeckRegistrations().length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDecks) return;
    let disposed = false;
    let controller: { dispose: () => void } | null = null;
    void import('./embeddedCardDeckScene').then(({ createEmbeddedCardDeckScene }) => {
      if (disposed) return;
      controller = createEmbeddedCardDeckScene(canvas);
    }).catch((error) => {
      console.warn('Embedded 3D cards unavailable; showing card fallbacks.', error);
    });
    return () => {
      disposed = true;
      controller?.dispose();
    };
  }, [hasDecks]);

  return (
    <canvas
      key={version > 0 ? 'registered' : 'empty'}
      ref={canvasRef}
      className={`card-deck-layer${hasDecks ? ' card-deck-layer--active' : ''}`}
      aria-hidden="true"
    />
  );
}