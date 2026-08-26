import { useState, useEffect, useRef } from 'react';
import {
  AUTOMATION_TUTORIAL_START_ID,
  TEMPLATE_TUTORIAL_START_ID,
  THEME_TUTORIAL_START_ID,
  TUTORIAL_STEPS,
  useTutorialStore,
  VARIOUS_TUTORIAL_START_ID,
} from '../store/useTutorialStore';
import { useStore } from '../store/useStore';
import { ArrowRightIcon, CheckIcon, XIcon } from './icons';

const BUBBLE_WIDTH = 320;
const BUBBLE_PADDING = 16; // padding from screen edge
const NARROW_BREAKPOINT = 600; // Width below which we use bottom-fixed layout

interface TutorialBubbleProps {
  darkMode?: boolean;
}

type TutorialStep = NonNullable<typeof TUTORIAL_STEPS[number]>;
type TutorialPosition = NonNullable<TutorialStep['position']>;

const TUTORIAL_SECTIONS = [
  { name: 'Basic', startId: TUTORIAL_STEPS[0].id },
  { name: 'Themes', startId: THEME_TUTORIAL_START_ID },
  { name: 'Templates', startId: TEMPLATE_TUTORIAL_START_ID },
  { name: 'Automation', startId: AUTOMATION_TUTORIAL_START_ID },
  { name: 'Various', startId: VARIOUS_TUTORIAL_START_ID },
];

function getTutorialProgress(stepIndex: number) {
  const sectionStarts = TUTORIAL_SECTIONS.map((section) => ({
    ...section,
    index: TUTORIAL_STEPS.findIndex((step) => step.id === section.startId),
  })).filter((section) => section.index >= 0);
  const nextSectionIndex = sectionStarts.findIndex((section) => section.index > stepIndex);
  const sectionIndex = nextSectionIndex === -1 ? sectionStarts.length - 1 : Math.max(0, nextSectionIndex - 1);
  const section = sectionStarts[sectionIndex];
  const nextSection = sectionStarts[sectionIndex + 1];
  const total = (nextSection?.index ?? TUTORIAL_STEPS.length) - section.index;

  return {
    name: section.name,
    current: stepIndex - section.index + 1,
    total,
  };
}

function TutorialCard({
  step,
  stepIndex,
  darkMode,
  isFinalStep,
  onAdvance,
  onExit,
}: {
  step: TutorialStep;
  stepIndex: number;
  darkMode: boolean;
  isFinalStep: boolean;
  onAdvance: () => void;
  onExit: () => void;
}) {
  const progress = getTutorialProgress(stepIndex);
  const progressPercent = (progress.current / progress.total) * 100;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border shadow-2xl ${
        darkMode
          ? 'border-white/20 bg-zinc-950 text-white'
          : 'border-gray-200 bg-white text-gray-900'
      }`}
      role="dialog"
      aria-live="polite"
      aria-label={`${progress.name} tutorial, step ${progress.current} of ${progress.total}`}
    >
      <div className={darkMode ? 'h-1 bg-white/10' : 'h-1 bg-gray-100'}>
        <div
          className="h-full bg-blue-500 transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={`text-[11px] font-semibold uppercase tracking-normal ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            {progress.name} tour · {progress.current} of {progress.total}
          </span>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit tutorial"
            title="Exit tutorial"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${
              darkMode ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
            {isFinalStep ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <span className="text-sm font-bold">{progress.current}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-sm font-bold leading-snug">{step.title}</h2>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-white/75' : 'text-gray-600'}`}>
              {step.message}
            </p>
          </div>
        </div>

        {(step.requiresManualAdvance || isFinalStep) && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={isFinalStep ? onExit : onAdvance}
              className={`flex min-h-9 items-center justify-center gap-2 rounded px-4 text-xs font-semibold transition-colors ${
                isFinalStep
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isFinalStep ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Finish tutorial
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorialBubble({ darkMode = false }: TutorialBubbleProps) {
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const exitTutorial = useTutorialStore((state) => state.exitTutorial);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const setTutorialStep = useTutorialStore((state) => state.setTutorialStep);
  const cleanupTransientCharacters = useStore((state) => state.cleanupTransientCharacters);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < NARROW_BREAKPOINT);

  const step = tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null;
  const isFinalStep = step?.id === 'try-widgets' || step?.id === 'themes-complete' || step?.id === 'templates-complete' || step?.id === 'automation-complete' || step?.id === 'various-complete';

  const handleAdvanceTutorial = () => {
    if (step?.id === 'various-feedback') {
      const printModeStep = TUTORIAL_STEPS.findIndex((tutorialStep) => tutorialStep.id === 'various-print-mode');
      if (printModeStep >= 0) {
        setTutorialStep(printModeStep);
        return;
      }
    }

    advanceTutorial();
  };

  const handleExitTutorial = () => {
    if (step?.id === 'try-widgets') {
      exitTutorial();
      return;
    }

    cleanupTransientCharacters();
    selectCharacter(null);
    exitTutorial();
  };

  // Handle narrow window detection on resize
  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!step?.scrollTargetIntoView || !step.targetSelector) return;

    let frameId: number;
    let remainingAttempts = 60;
    const scrollToTarget = () => {
      const target = Array.from(document.querySelectorAll(step.targetSelector!)).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }

      remainingAttempts -= 1;
      if (remainingAttempts > 0) {
        frameId = requestAnimationFrame(scrollToTarget);
      }
    };

    frameId = requestAnimationFrame(scrollToTarget);
    return () => cancelAnimationFrame(frameId);
  }, [step]);

  if (!step) return null;

  // Steps that should show at top on narrow screens (e.g., when Done button is at bottom)
  const showAtTopOnNarrow =
    step.dock === 'top' ||
    step.id === 'click-create' ||
    step.id === 'form-click-done' ||
    step.id === 'automation-close-number-display' ||
    step.id === 'automation-close-dice-roller' ||
    step.id === 'templates-load-widget-template';

  // For narrow windows, show at bottom or top depending on step
  if (isNarrow) {
    return (
      <div
        data-tutorial-bubble="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="fixed z-[12000] left-0 right-0 px-4"
        style={showAtTopOnNarrow ? { top: BUBBLE_PADDING + 50 } : { bottom: BUBBLE_PADDING }}
      >
        <div className="mx-auto max-w-[400px]">
          <TutorialCard
            step={step}
            stepIndex={tutorialStep!}
            darkMode={darkMode}
            isFinalStep={isFinalStep}
            onAdvance={handleAdvanceTutorial}
            onExit={handleExitTutorial}
          />
        </div>
      </div>
    );
  }

  // Desktop/wide layout with positioned bubbles
  return <PositionedBubble step={step} stepIndex={tutorialStep!} darkMode={darkMode} exitTutorial={handleExitTutorial} advanceTutorial={handleAdvanceTutorial} />;
}

// Separate component for positioned bubbles (desktop)
function PositionedBubble({ 
  step, 
  stepIndex,
  darkMode, 
  exitTutorial, 
  advanceTutorial 
}: { 
  step: NonNullable<typeof TUTORIAL_STEPS[number]>;
  stepIndex: number;
  darkMode: boolean;
  exitTutorial: () => void;
  advanceTutorial: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [adjustedTransform, setAdjustedTransform] = useState('');
  const [isCentered, setIsCentered] = useState(false);
  const [effectivePosition, setEffectivePosition] = useState<TutorialPosition>(step.position || 'center');
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isFinalStep = step.id === 'try-widgets' || step.id === 'themes-complete' || step.id === 'templates-complete' || step.id === 'automation-complete' || step.id === 'various-complete';

  useEffect(() => {
    if (step?.dock === 'top' && !step?.targetSelector) {
      setIsCentered(true);
      setPosition({
        top: BUBBLE_PADDING + 48,
        left: window.innerWidth / 2,
      });
      setAdjustedTransform('translateX(-50%)');
      setEffectivePosition('top');
      return;
    }

    // Handle centered position (no target)
    if (step?.position === 'center' || !step?.targetSelector) {
      setIsCentered(true);
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      setAdjustedTransform('translate(-50%, -50%)');
      setEffectivePosition('center');
      return;
    }

    setIsCentered(false);

    const updatePosition = () => {
      const target = Array.from(document.querySelectorAll(step.targetSelector!)).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (!target) {
        setIsCentered(true);
        setPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
        });
        setAdjustedTransform('translate(-50%, -50%)');
        setEffectivePosition('center');
        return;
      }

      setIsCentered(false);
      if (target) {
        const rect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const bubbleWidth = bubbleRef.current?.offsetWidth || BUBBLE_WIDTH;
        const bubbleHeight = bubbleRef.current?.offsetHeight || 180;
        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
        const gap = 12;
        const space = {
          left: rect.left - BUBBLE_PADDING,
          right: viewportWidth - rect.right - BUBBLE_PADDING,
          top: rect.top - BUBBLE_PADDING,
          bottom: viewportHeight - rect.bottom - BUBBLE_PADDING,
        };
        const fits = {
          left: space.left >= bubbleWidth + gap,
          right: space.right >= bubbleWidth + gap,
          top: space.top >= bubbleHeight + gap,
          bottom: space.bottom >= bubbleHeight + gap,
        };
        const preferred = step.position || 'center';
        let placement: TutorialPosition = preferred;

        if (preferred === 'left' && !fits.left) {
          placement = fits.right ? 'right' : fits.bottom ? 'bottom' : fits.top ? 'top' : 'center';
        } else if (preferred === 'right' && !fits.right) {
          placement = fits.left ? 'left' : fits.bottom ? 'bottom' : fits.top ? 'top' : 'center';
        } else if (preferred === 'top' && !fits.top) {
          placement = fits.bottom ? 'bottom' : fits.right ? 'right' : fits.left ? 'left' : 'center';
        } else if (preferred === 'bottom' && !fits.bottom) {
          placement = fits.top ? 'top' : fits.right ? 'right' : fits.left ? 'left' : 'center';
        }

        let top = 0;
        let left = 0;
        let transform = '';

        switch (placement) {
          case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2;
            // Check if bubble would go off left edge
            if (left - BUBBLE_WIDTH / 2 < BUBBLE_PADDING) {
              left = BUBBLE_PADDING;
              transform = 'translateX(0)';
            }
            // Check if bubble would go off right edge
            else if (left + BUBBLE_WIDTH / 2 > viewportWidth - BUBBLE_PADDING) {
              left = viewportWidth - BUBBLE_PADDING;
              transform = 'translateX(-100%)';
            }
            else {
              transform = 'translateX(-50%)';
            }
            break;
          case 'top':
            top = rect.top - gap;
            left = rect.left + rect.width / 2;
            // Check if bubble would go off left edge
            if (left - BUBBLE_WIDTH / 2 < BUBBLE_PADDING) {
              left = BUBBLE_PADDING;
              transform = 'translateX(0) translateY(-100%)';
            }
            // Check if bubble would go off right edge
            else if (left + BUBBLE_WIDTH / 2 > viewportWidth - BUBBLE_PADDING) {
              left = viewportWidth - BUBBLE_PADDING;
              transform = 'translateX(-100%) translateY(-100%)';
            }
            else {
              transform = 'translateX(-50%) translateY(-100%)';
            }
            break;
          case 'left':
            top = clamp(rect.top + rect.height / 2 - bubbleHeight / 2, BUBBLE_PADDING, viewportHeight - bubbleHeight - BUBBLE_PADDING);
            left = rect.left - gap - bubbleWidth;
            transform = '';
            break;
          case 'right':
            top = clamp(rect.top + rect.height / 2 - bubbleHeight / 2, BUBBLE_PADDING, viewportHeight - bubbleHeight - BUBBLE_PADDING);
            left = rect.right + gap;
            transform = '';
            break;
          case 'center':
            top = window.innerHeight / 2;
            left = window.innerWidth / 2;
            transform = 'translate(-50%, -50%)';
            break;
        }

        setPosition({ top, left });
        setAdjustedTransform(transform);
        setEffectivePosition(placement);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    // Also update on animation frame for smooth tracking
    let rafId: number;
    const rafUpdate = () => {
      updatePosition();
      rafId = requestAnimationFrame(rafUpdate);
    };
    rafId = requestAnimationFrame(rafUpdate);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      cancelAnimationFrame(rafId);
    };
  }, [step]);

  const getArrowStyle = (): React.CSSProperties => {
    const arrowSize = 10;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    const borderColor = darkMode ? 'rgba(255,255,255,0.3)' : '#e5e7eb';

    switch (effectivePosition) {
      case 'center':
        return { display: 'none' };
      case 'bottom':
        return {
          ...baseStyle,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent ${borderColor} transparent`,
        };
      case 'top':
        return {
          ...baseStyle,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: `${borderColor} transparent transparent transparent`,
        };
      case 'left':
        return {
          ...baseStyle,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent transparent ${borderColor}`,
        };
      case 'right':
        return {
          ...baseStyle,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: `transparent ${borderColor} transparent transparent`,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      data-tutorial-bubble="true"
      onMouseDown={(event) => event.stopPropagation()}
      className="fixed z-[12000]"
      style={{
        top: position.top,
        left: position.left,
        transform: adjustedTransform,
      }}
    >
      <div ref={bubbleRef} className="relative w-[320px] max-w-[calc(100vw-32px)]">
        {/* Arrow */}
        {!isCentered && effectivePosition !== 'center' && <div style={getArrowStyle()} />}
        <TutorialCard
          step={step}
          stepIndex={stepIndex}
          darkMode={darkMode}
          isFinalStep={isFinalStep}
          onAdvance={advanceTutorial}
          onExit={exitTutorial}
        />
      </div>
    </div>
  );
}

// Helper hook to check if current page should show tutorial
export function useTutorialForPage(page: 'character-list' | 'sheet') {
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const currentStep = tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null;
  
  return {
    isActive: currentStep?.page === page,
    step: currentStep,
    stepIndex: tutorialStep,
  };
}
