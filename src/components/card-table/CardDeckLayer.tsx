import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  getCardDeckDragState,
  getCardDeckRegistrations,
  getCardDeckRegistryVersion,
  subscribeCardDeckRegistry,
} from './cardDeckRegistry';

interface Props {
  pan: { x: number; y: number };
  scale: number;
}

export default function CardDeckLayer({ pan, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLayerRef = useRef<HTMLDivElement>(null);
  const version = useSyncExternalStore(
    subscribeCardDeckRegistry,
    getCardDeckRegistryVersion,
    getCardDeckRegistryVersion,
  );
  const hasDecks = getCardDeckRegistrations().length > 0;
  const isCardDragging = getCardDeckDragState()?.phase === 'dragging';
  const inverseCanvasTransform = `translate(${-pan.x / scale}px, ${-pan.y / scale}px) scale(${1 / scale})`;
  const layerStyle = { transform: inverseCanvasTransform, transformOrigin: 'top left' };

  useEffect(() => {
    const canvas = canvasRef.current;
    const faceLayer = faceLayerRef.current;
    if (!canvas || !faceLayer || !hasDecks) return;
    let disposed = false;
    let controller: { dispose: () => void } | null = null;
    void import('./embeddedCardDeckScene').then(({ createEmbeddedCardDeckScene }) => {
      if (disposed) return;
      controller = createEmbeddedCardDeckScene(canvas, faceLayer);
    }).catch((error) => {
      console.warn('Embedded 3D cards unavailable; showing card fallbacks.', error);
    });
    return () => {
      disposed = true;
      controller?.dispose();
    };
  }, [hasDecks]);

  return (
    <>
      <canvas
        key={version > 0 ? 'registered' : 'empty'}
        ref={canvasRef}
        className={`card-deck-layer${hasDecks ? ' card-deck-layer--active' : ''}${isCardDragging ? ' card-deck-layer--dragging' : ''}`}
        style={layerStyle}
        aria-hidden="true"
      />
      <div
        ref={faceLayerRef}
        className={`card-deck-dom-layer${isCardDragging ? ' card-deck-dom-layer--dragging' : ''}`}
        style={layerStyle}
        aria-hidden="true"
      />
      <div
        className={`card-deck-controls-layer${isCardDragging ? ' card-deck-controls-layer--dragging' : ''}`}
        style={layerStyle}
      />
    </>
  );
}