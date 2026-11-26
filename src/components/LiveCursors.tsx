import { useSessionStore } from '../store/useSessionStore';

interface LiveCursorsProps {
  sheetId: string;
}

/** Other participants' pointers, drawn inside the camera-transformed canvas so they track the sheet. */
export default function LiveCursors({ sheetId }: LiveCursorsProps) {
  const cursors = useSessionStore((state) => state.cursors);
  const participants = useSessionStore((state) => state.participants);
  const selfId = useSessionStore((state) => state.selfId);

  const visible = participants.filter((participant) => (
    participant.id !== selfId && cursors[participant.id]?.sheetId === sheetId
  ));
  if (visible.length === 0) return null;

  return (
    <div data-print-hide="true" className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 100000 }}>
      {visible.map((participant) => {
        const { x, y } = cursors[participant.id];
        return (
          <div
            key={participant.id}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${x}px, ${y}px) scale(calc(1 / var(--camera-scale, 1)))`,
              transformOrigin: 'top left',
              transition: 'transform 60ms linear',
            }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" className="drop-shadow" aria-hidden="true">
              <path d="M1 1 L1 17 L5.5 13 L9 20.5 L12 19 L8.5 12 L14.5 12 Z" fill={participant.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span
              className="absolute left-4 top-4 max-w-[160px] truncate whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight text-white shadow"
              style={{ backgroundColor: participant.color }}
            >
              {participant.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
