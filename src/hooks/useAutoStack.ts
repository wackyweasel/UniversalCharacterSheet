import { useCallback, useRef, useState } from 'react';
import type { Widget, WidgetAutoStackOptions } from '../types';
import { useStore } from '../store/useStore';
import { clearWidgetProbeSizes } from '../components/widgetSizeProbe';
import {
  createAutoStackPlan,
  layoutPlanBlocks,
  placeBlocks,
  placementsToLayouts,
  type BlockOptions,
} from '../utils/autoStackPlan';
import { findTouchingPairs, normalizeWidgetAutoStack, type AutoStackSettings } from '../utils/autoStackSettings';
import { fixOverflow, measureAutoStack, type AutoStackMeasurement } from './autoStackMeasure';

interface UseAutoStackOptions {
  widgets: Widget[];
}

const MAX_FIX_ROUNDS = 3;

export function useAutoStack({ widgets }: UseAutoStackOptions) {
  const applyWidgetLayouts = useStore((state) => state.applyWidgetLayouts);
  const [isAutoStacking, setIsAutoStacking] = useState(false);
  const runningRef = useRef(false);

  // Measures what shapes each widget can take; the canvas is hidden while widgets render at trial sizes.
  const measure = useCallback(async (): Promise<AutoStackMeasurement | null> => {
    if (widgets.length === 0 || runningRef.current) return null;
    runningRef.current = true;
    setIsAutoStacking(true);
    try {
      return await measureAutoStack(widgets);
    } finally {
      clearWidgetProbeSizes();
      runningRef.current = false;
      setIsAutoStacking(false);
    }
  }, [widgets]);

  const apply = useCallback(async (measurement: AutoStackMeasurement, settings: AutoStackSettings, options: BlockOptions) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsAutoStacking(true);
    try {
      const plan = createAutoStackPlan(measurement.blocks, settings, measurement.screenAspect, options);
      let { result } = plan;
      for (let round = 0; round < MAX_FIX_ROUNDS && await fixOverflow(plan.blocks, result); round++) {
        result = layoutPlanBlocks(plan.blocks, settings, plan.targetAspect);
      }

      const placements = placeBlocks(plan.blocks, result);
      const autoStackOptions: Record<string, WidgetAutoStackOptions | undefined> = {};
      for (const block of measurement.blocks) {
        const normalized = normalizeWidgetAutoStack(options[block.id]);
        for (const member of block.members) autoStackOptions[member.widget.id] = normalized;
      }
      const attachPairs = settings.autoAttach ? findTouchingPairs(placements) : undefined;
      applyWidgetLayouts(placementsToLayouts(placements, measurement.origin), 'Auto stack', { attachPairs, autoStackOptions });
    } finally {
      clearWidgetProbeSizes();
      runningRef.current = false;
      setIsAutoStacking(false);
    }
  }, [applyWidgetLayouts]);

  return { measure, apply, isAutoStacking };
}
