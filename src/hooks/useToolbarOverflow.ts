import { RefObject, useEffect, useMemo, useRef, useState } from 'react';

export interface ToolbarActionCapacity {
  id: string;
  width?: number;
  labeledWidth?: number;
  iconWidth?: number;
}

interface ToolbarOverflowOptions {
  actions: ToolbarActionCapacity[];
  coreWidth: number | ((containerWidth: number) => number);
  minimumExpandedWidth?: number;
}

interface ToolbarOverflowResult {
  containerRef: RefObject<HTMLElement>;
  containerWidth: number;
  expanded: boolean;
  inlineActionIds: ReadonlySet<string>;
  labeledActionIds: ReadonlySet<string>;
}

export function useToolbarOverflow({
  actions,
  coreWidth,
  minimumExpandedWidth = 480,
}: ToolbarOverflowOptions): ToolbarOverflowResult {
  const containerRef = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const expanded = containerWidth >= minimumExpandedWidth;
  const { inlineActionIds, labeledActionIds } = useMemo(() => {
    const inline = new Set(actions.map((action) => action.id));
    const labeled = new Set(
      actions
        .filter((action) => action.labeledWidth !== undefined)
        .map((action) => action.id),
    );
    if (!expanded) return { inlineActionIds: new Set<string>(), labeledActionIds: new Set<string>() };

    const reservedWidth = typeof coreWidth === 'function' ? coreWidth(containerWidth) : coreWidth;
    const availableWidth = Math.max(0, containerWidth - reservedWidth);
    const iconWidth = (action: ToolbarActionCapacity) => action.iconWidth ?? action.width ?? 0;
    const labeledWidth = (action: ToolbarActionCapacity) => action.labeledWidth ?? iconWidth(action);
    let requiredWidth = actions.reduce((total, action) => total + labeledWidth(action), 0);

    for (let index = actions.length - 1; index >= 0 && requiredWidth > availableWidth; index -= 1) {
      const action = actions[index];
      if (!labeled.has(action.id)) continue;
      labeled.delete(action.id);
      requiredWidth -= labeledWidth(action) - iconWidth(action);
    }

    for (let index = actions.length - 1; index >= 0 && requiredWidth > availableWidth; index -= 1) {
      const action = actions[index];
      inline.delete(action.id);
      labeled.delete(action.id);
      requiredWidth -= iconWidth(action);
    }

    return { inlineActionIds: inline, labeledActionIds: labeled };
  }, [actions, containerWidth, coreWidth, expanded]);

  return { containerRef, containerWidth, expanded, inlineActionIds, labeledActionIds };
}