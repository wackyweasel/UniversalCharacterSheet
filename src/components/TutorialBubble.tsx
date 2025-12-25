import { useState, useEffect } from 'react';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';

const BUBBLE_WIDTH = 300; // max-w-[300px]
const BUBBLE_PADDING = 16; // padding from screen edge
const NARROW_BREAKPOINT = 600; // Width below which we use bottom-fixed layout

interface TutorialBubbleProps {
  darkMode?: boolean;
}

export default function TutorialBubble({ darkMode = false }: TutorialBubbleProps) {
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const exitTutorial = useTutorialStore((state) => state.exitTutorial);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < NARROW_BREAKPOINT);

  const step = tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null;

  // Handle narrow window detection on resize
  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!step) return null;

  // Steps that should show at top on narrow screens (e.g., when Done button is at bottom)
  const showAtTopOnNarrow = step.id === 'form-click-done';

  // For narrow windows, show at bottom or top depending on step
  if (isNarrow) {
    return (
      <div
        className="fixed z-[100] left-0 right-0 px-4"
        style={showAtTopOnNarrow ? { top: BUBBLE_PADDING + 50 } : { bottom: BUBBLE_PADDING }}
      >
        <div
          className={`mx-auto p-4 rounded-lg shadow-lg max-w-[400px] ${
            darkMode
              ? 'bg-black border border-white/30 text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
          style={{
            animation: 'subtle-pulse 3s ease-in-out infinite',
          }}
        >
          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1">{step.title}</h4>
              <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                {step.message}
              </p>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="mt-3 flex gap-2">
            {step.requiresManualAdvance && (
              <button
                onClick={advanceTutorial}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors bg-blue-500 hover:bg-blue-600 text-white"
              >
                Next →
              </button>
            )}
            <button
              onClick={exitTutorial}
              className={`${step.requiresManualAdvance ? '' : 'flex-1'} px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                step.id === 'try-widgets'
                  ? 'bg-green-500 hover:bg-green-600 text-white font-bold'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white/70'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {step.id === 'try-widgets' ? '🎉 End of Tutorial' : 'Exit Tutorial'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/wide layout with positioned bubbles
  return <PositionedBubble step={step} darkMode={darkMode} exitTutorial={exitTutorial} advanceTutorial={advanceTutorial} />;
}

// Separate component for positioned bubbles (desktop)
function PositionedBubble({ 
  step, 
  darkMode, 
  exitTutorial, 
  advanceTutorial 
}: { 
  step: NonNullable<typeof TUTORIAL_STEPS[number]>;
  darkMode: boolean;
  exitTutorial: () => void;
  advanceTutorial: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [adjustedTransform, setAdjustedTransform] = useState('');
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    // Handle centered position (no target)
    if (step?.position === 'center' || !step?.targetSelector) {
      setIsCentered(true);
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      setAdjustedTransform('translate(-50%, -50%)');
      return;
    }

    setIsCentered(false);

    const updatePosition = () => {
      const target = document.querySelector(step.targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        let top = 0;
        let left = 0;
        let transform = '';

        switch (step.position) {
          case 'bottom':
            top = rect.bottom + 12;
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
            top = rect.top - 12;
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
            top = rect.top + rect.height / 2;
            left = rect.left - 12;
            transform = 'translateX(-100%) translateY(-50%)';
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + 12;
            transform = 'translateY(-50%)';
            break;
        }

        setPosition({ top, left });
        setAdjustedTransform(transform);
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

    switch (step.position) {
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
      className="fixed z-[100]"
      style={{
        top: position.top,
        left: position.left,
        transform: adjustedTransform,
      }}
    >
      <div
        className={`relative p-4 rounded-lg shadow-lg max-w-[300px] ${
          darkMode
            ? 'bg-black border border-white/30 text-white'
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
        style={{
          animation: 'subtle-pulse 3s ease-in-out infinite',
        }}
      >
        {/* Arrow */}
        {!isCentered && <div style={getArrowStyle()} />}
        
        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">{step.title}</h4>
            <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
              {step.message}
            </p>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="mt-3 flex gap-2">
          {step.requiresManualAdvance && (
            <button
              onClick={advanceTutorial}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors bg-blue-500 hover:bg-blue-600 text-white"
            >
              Next →
            </button>
          )}
          <button
            onClick={exitTutorial}
            className={`${step.requiresManualAdvance ? '' : 'flex-1'} px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              step.id === 'try-widgets'
                ? 'bg-green-500 hover:bg-green-600 text-white font-bold'
                : darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white/70'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {step.id === 'try-widgets' ? '🎉 End of Tutorial' : 'Exit Tutorial'}
          </button>
        </div>
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
