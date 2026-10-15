import { Tooltip } from './Tooltip';
import { XIcon } from './icons';

/** Sits next to a dice widget's roll button to dismiss its inline result. */
export function ClearDiceResultButton({ onClear }: { onClear: () => void }) {
  return (
    <Tooltip content="Clear results">
      <button
        type="button"
        aria-label="Clear results"
        className="widget-control w-7 flex-shrink-0 self-stretch"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
