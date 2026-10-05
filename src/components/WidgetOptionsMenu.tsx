import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import type { Sheet as CharacterSheet, Widget } from '../types';
import { useStore } from '../store/useStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { isTutorialStep, useTutorialStore } from '../store/useTutorialStore';
import { Tooltip } from './Tooltip';

export const WIDGET_OPTIONS_OPEN_EVENT = 'widget-options-open';

const MENU_ESTIMATED_HEIGHT = 240;
const MENU_ALIGN_THRESHOLD = 198;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const EMPTY_SHEETS: CharacterSheet[] = [];

interface MenuPosition {
  x: number;
  y: number;
  alignLeft: boolean;
  above: boolean;
}

interface Props {
  widget: Widget;
  /** Menu button; anchors the menu when there is no point and never counts as an outside click. */
  anchorRef: RefObject<HTMLElement>;
  /** Viewport point for context menus. */
  point: { x: number; y: number } | null;
  onClose: () => void;
  onEdit: () => void;
}

const isAutomationAttackRoller = (widget: Widget) => (
  widget.type === 'DICE_ROLLER' && String(widget.data?.label || '').toLowerCase() === 'attack'
);

export function isWidgetEditTutorialTarget(widget: Widget, tutorialStep: number | null) {
  return (widget.type === 'FORM' && isTutorialStep(tutorialStep, 'edit-widget'))
    || (widget.type === 'NUMBER_DISPLAY' && isTutorialStep(tutorialStep, 'automation-edit-number-display'))
    || (isAutomationAttackRoller(widget) && isTutorialStep(tutorialStep, 'automation-edit-dice-roller'));
}

export function isWidgetMenuTutorialTarget(widget: Widget, tutorialStep: number | null) {
  return (widget.type === 'FORM' && (
    isTutorialStep(tutorialStep, 'widget-menu')
    || isTutorialStep(tutorialStep, 'templates-open-widget-menu')
    || isTutorialStep(tutorialStep, 'templates-open-group-menu')
  ))
    || (widget.type === 'NUMBER_DISPLAY' && isTutorialStep(tutorialStep, 'automation-open-number-display-menu'))
    || (isAutomationAttackRoller(widget) && isTutorialStep(tutorialStep, 'automation-open-dice-menu'));
}

export function getWidgetMenuTutorialTarget(widget: Widget) {
  if (widget.type !== 'DICE_ROLLER') return `widget-menu-${widget.type}`;
  return isAutomationAttackRoller(widget) ? 'widget-menu-DICE_ROLLER' : undefined;
}

const samePosition = (a: MenuPosition | null, b: MenuPosition | null) => (
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.alignLeft === b.alignLeft && a.above === b.above)
);

export default function WidgetOptionsMenu({ widget, anchorRef, point, onClose, onEdit }: Props) {
  const removeWidget = useStore((state) => state.removeWidget);
  const cloneWidget = useStore((state) => state.cloneWidget);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const toggleWidgetLock = useStore((state) => state.toggleWidgetLock);
  const moveWidgetToSheet = useStore((state) => state.moveWidgetToSheet);
  const getWidgetsInGroup = useStore((state) => state.getWidgetsInGroup);
  const cloneGroup = useStore((state) => state.cloneGroup);
  const removeGroup = useStore((state) => state.removeGroup);
  const toggleGroupLock = useStore((state) => state.toggleGroupLock);
  const moveGroupToSheet = useStore((state) => state.moveGroupToSheet);
  const detachAllInGroup = useStore((state) => state.detachAllInGroup);
  const activeSheetId = useStore((state) => (
    state.characters.find((character) => character.id === state.activeCharacterId)?.activeSheetId
  ));
  const sheets = useStore(useShallow((state) => (
    state.characters.find((character) => character.id === state.activeCharacterId)?.sheets ?? EMPTY_SHEETS
  )));
  const addTemplate = useTemplateStore((state) => state.addTemplate);
  const addGroupTemplate = useTemplateStore((state) => state.addGroupTemplate);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => isTutorialStep(tutorialStep, id);

  const menuToken = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [tab, setTab] = useState<'widget' | 'group'>('widget');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showMoveToSheet, setShowMoveToSheet] = useState(false);
  const [showGroupDeleteConfirm, setShowGroupDeleteConfirm] = useState(false);
  const [showGroupTemplateNameInput, setShowGroupTemplateNameInput] = useState(false);
  const [groupTemplateName, setGroupTemplateName] = useState('');
  const [showGroupMoveToSheet, setShowGroupMoveToSheet] = useState(false);

  const hasMultipleSheets = sheets.length > 1;
  const editTutorialTarget = widget.type === 'DICE_ROLLER'
    ? isAutomationAttackRoller(widget) ? 'edit-button-DICE_ROLLER' : undefined
    : `edit-button-${widget.type}`;
  const shouldHighlightEdit = isWidgetEditTutorialTarget(widget, tutorialStep);
  const shouldHighlightWidgetTemplateSave = isCurrentTutorialStep('templates-save-widget-template');
  const shouldHighlightWidgetTemplateConfirm = isCurrentTutorialStep('templates-name-widget-template') && templateName.trim().length > 0;
  const shouldHighlightGroupTab = isCurrentTutorialStep('templates-open-group-tab');
  const shouldHighlightGroupTemplateSave = isCurrentTutorialStep('templates-save-group-template');
  const shouldHighlightGroupTemplateConfirm = isCurrentTutorialStep('templates-name-group-template') && groupTemplateName.trim().length > 0;

  // Only one widget menu stays open at a time.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(WIDGET_OPTIONS_OPEN_EVENT, { detail: menuToken }));
    const handleOtherMenuOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== menuToken) onCloseRef.current();
    };
    window.addEventListener(WIDGET_OPTIONS_OPEN_EVENT, handleOtherMenuOpen);
    return () => window.removeEventListener(WIDGET_OPTIONS_OPEN_EVENT, handleOtherMenuOpen);
  }, [menuToken]);

  useEffect(() => {
    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
    };
  }, [anchorRef]);

  const pointX = point?.x;
  const pointY = point?.y;
  useLayoutEffect(() => {
    const reposition = () => {
      const menuHeight = menuRef.current?.getBoundingClientRect().height ?? MENU_ESTIMATED_HEIGHT;
      let next: MenuPosition | null = null;
      if (pointX !== undefined && pointY !== undefined) {
        next = {
          x: pointX,
          y: pointY,
          alignLeft: pointX < window.innerWidth - MENU_ALIGN_THRESHOLD,
          above: pointY + menuHeight > window.innerHeight - VIEWPORT_PADDING,
        };
      } else {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (rect) {
          const alignLeft = rect.right < MENU_ALIGN_THRESHOLD;
          const above = rect.bottom + MENU_GAP + menuHeight > window.innerHeight - VIEWPORT_PADDING;
          next = {
            x: alignLeft ? rect.left : rect.right,
            y: above ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
            alignLeft,
            above,
          };
        }
      }
      setPosition((current) => samePosition(current, next) ? current : next);
    };

    reposition();
    // The anchor can still be settling its scale transform on the first frame.
    const frame = window.requestAnimationFrame(reposition);
    const resizeObserver = new ResizeObserver(reposition);
    if (menuRef.current) resizeObserver.observe(menuRef.current);
    window.addEventListener('resize', reposition);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', reposition);
    };
  }, [anchorRef, pointX, pointY]);

  const resetSubStates = () => {
    setShowDeleteConfirm(false);
    setShowTemplateNameInput(false);
    setShowMoveToSheet(false);
    setShowGroupDeleteConfirm(false);
    setShowGroupTemplateNameInput(false);
    setShowGroupMoveToSheet(false);
  };

  const saveWidgetTemplate = () => {
    if (!templateName.trim()) return;
    addTemplate(widget, templateName.trim());
    onClose();
    if (isCurrentTutorialStep('templates-name-widget-template')) advanceTutorial();
  };

  const saveGroupTemplate = () => {
    if (!groupTemplateName.trim() || !widget.groupId) return;
    addGroupTemplate(getWidgetsInGroup(widget.groupId), groupTemplateName.trim());
    onClose();
    if (isCurrentTutorialStep('templates-name-group-template')) advanceTutorial();
  };

  const groupWidgets = widget.groupId ? getWidgetsInGroup(widget.groupId) : [];
  const isGroupLocked = groupWidgets.length > 0 && groupWidgets.every((member) => member.locked);
  const transform = position
    ? `${position.alignLeft ? '' : 'translateX(-100%)'}${position.above ? ' translateY(-100%)' : ''}`.trim() || 'none'
    : 'none';

  return createPortal(
    <div
      ref={menuRef}
      className="widget-options-menu fixed z-[10003] max-h-[calc(100dvh-16px)] min-w-[190px] overflow-y-auto rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper shadow-theme font-body"
      style={{
        left: `${position?.x ?? 0}px`,
        top: `${position?.y ?? 0}px`,
        transform,
        visibility: position ? 'visible' : 'hidden',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Tab Header - only show if widget is part of a group */}
      {widget.groupId && (
        <div className="flex border-b border-theme-border">
          <Tooltip content="Show actions for this widget" placement="left">
            <button
              className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'widget' ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-border/30'}`}
              onClick={(e) => {
                e.stopPropagation();
                setTab('widget');
                resetSubStates();
              }}
            >
              Widget
            </button>
          </Tooltip>
          <Tooltip content="Show actions for the whole group" placement="left">
            <button
              data-tutorial="template-group-tab"
              className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${tab === 'group' ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-border/30'} ${shouldHighlightGroupTab ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setTab('group');
                if (isCurrentTutorialStep('templates-open-group-tab')) advanceTutorial();
                resetSubStates();
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Group
            </button>
          </Tooltip>
        </div>
      )}

      {/* Widget Actions Tab */}
      {tab === 'widget' && (
        <>
          <Tooltip content="Open this widget's editor" placement="left">
            <button
              data-tutorial={editTutorialTarget}
              className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${shouldHighlightEdit ? 'bg-blue-500 text-white' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit
            </button>
          </Tooltip>
          <Tooltip content="Create a copy of this widget" placement="left">
            <button
              className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                cloneWidget(widget.id);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Clone
            </button>
          </Tooltip>
          <Tooltip content={widget.locked ? 'Unlock this widget so it can be moved or edited' : 'Lock this widget to prevent changes'} placement="left">
            <button
              className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                toggleWidgetLock(widget.id);
              }}
            >
              {widget.locked ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              )}
              {widget.locked ? 'Unlock' : 'Lock'}
            </button>
          </Tooltip>
          {!showTemplateNameInput ? (
            <Tooltip content="Save this widget as a reusable template (templates are at the bottom of the widget selection panel)" placement="left">
              <button
                data-tutorial="template-save-widget"
                className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${shouldHighlightWidgetTemplateSave ? 'bg-blue-500 text-white font-bold' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setTemplateName(isCurrentTutorialStep('templates-save-widget-template') ? '' : widget.data.label || '');
                  setShowTemplateNameInput(true);
                  if (isCurrentTutorialStep('templates-save-widget-template')) advanceTutorial();
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                Save as Template
              </button>
            </Tooltip>
          ) : (
            <div className="px-2 py-2">
              <input
                data-tutorial={templateName.trim() ? 'template-widget-name-input' : 'template-widget-name-target'}
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink mb-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    saveWidgetTemplate();
                  } else if (e.key === 'Escape') {
                    setShowTemplateNameInput(false);
                    setTemplateName('');
                  }
                }}
              />
              <div className="flex gap-1">
                <Tooltip content="Save this widget template" placement="left">
                  <button
                    data-tutorial={templateName.trim() ? 'template-widget-name-target' : 'template-widget-save-confirm'}
                    className={`flex-1 px-2 py-1 text-xs bg-theme-accent text-theme-paper rounded hover:bg-theme-accent/80 transition-colors ${shouldHighlightWidgetTemplateConfirm ? 'ring-4 ring-blue-500 ring-offset-1 font-bold' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      saveWidgetTemplate();
                    }}
                  >
                    Save
                  </button>
                </Tooltip>
                <Tooltip content="Cancel template creation" placement="left">
                  <button
                    className="flex-1 px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTemplateNameInput(false);
                      setTemplateName('');
                    }}
                  >
                    Cancel
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
          {hasMultipleSheets && (
            !showMoveToSheet ? (
              <Tooltip content="Move this widget to another sheet" placement="left">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveToSheet(true);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                  Move to Sheet
                </button>
              </Tooltip>
            ) : (
              <div className="px-2 py-2">
                <div className="text-xs text-theme-muted mb-2">Select target sheet:</div>
                {sheets
                  .filter((sheet) => sheet.id !== activeSheetId)
                  .map((sheet) => (
                    <Tooltip key={sheet.id} content={`Move this widget to ${sheet.name}`} placement="left">
                      <button
                        className="w-full px-2 py-1.5 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors rounded mb-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidgetToSheet(widget.id, sheet.id);
                          onClose();
                        }}
                      >
                        {sheet.name}
                      </button>
                    </Tooltip>
                  ))}
                <Tooltip content="Cancel moving this widget" placement="left">
                  <button
                    className="w-full px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveToSheet(false);
                    }}
                  >
                    Cancel
                  </button>
                </Tooltip>
              </div>
            )
          )}
          {widget.groupId && (
            <Tooltip content="Remove this widget from its current group" placement="left">
              <button
                className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  detachWidgets(widget.id, widget.id);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                Detach from Group
              </button>
            </Tooltip>
          )}
          <div className="border-t border-theme-border" />
          {!showDeleteConfirm ? (
            <Tooltip content="Delete this widget" placement="left">
              <button
                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                Delete
              </button>
            </Tooltip>
          ) : (
            <div className="flex">
              <Tooltip content="Confirm widget deletion" placement="left">
                <button
                  className="flex-1 px-3 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    removeWidget(widget.id);
                  }}
                >
                  Confirm
                </button>
              </Tooltip>
              <Tooltip content="Cancel widget deletion" placement="left">
                <button
                  className="flex-1 px-3 py-2 text-sm text-theme-muted hover:bg-theme-accent hover:text-theme-paper transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                >
                  Cancel
                </button>
              </Tooltip>
            </div>
          )}
        </>
      )}

      {/* Group Actions Tab */}
      {tab === 'group' && widget.groupId && (
        <>
          <Tooltip content="Create a copy of this entire group" placement="left">
            <button
              className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                cloneGroup(widget.groupId!);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Clone Group
            </button>
          </Tooltip>
          <Tooltip content={isGroupLocked ? 'Unlock this group so its widgets can be changed' : 'Lock this group to prevent changes'} placement="left">
            <button
              className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                toggleGroupLock(widget.groupId!);
              }}
            >
              {isGroupLocked ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                  Unlock Group
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Lock Group
                </>
              )}
            </button>
          </Tooltip>
          {!showGroupTemplateNameInput ? (
            <Tooltip content="Save this group as a reusable template (templates are at the bottom of the widget selection panel)" placement="left">
              <button
                data-tutorial="template-save-group"
                className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${shouldHighlightGroupTemplateSave ? 'bg-blue-500 text-white font-bold' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setGroupTemplateName('');
                  setShowGroupTemplateNameInput(true);
                  if (isCurrentTutorialStep('templates-save-group-template')) advanceTutorial();
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                Save Group as Template
              </button>
            </Tooltip>
          ) : (
            <div className="px-2 py-2">
              <input
                data-tutorial={groupTemplateName.trim() ? 'template-group-name-input' : 'template-group-name-target'}
                type="text"
                value={groupTemplateName}
                onChange={(e) => setGroupTemplateName(e.target.value)}
                placeholder="Group template name..."
                className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink mb-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    saveGroupTemplate();
                  } else if (e.key === 'Escape') {
                    setShowGroupTemplateNameInput(false);
                    setGroupTemplateName('');
                  }
                }}
              />
              <div className="flex gap-1">
                <Tooltip content="Save this group template" placement="left">
                  <button
                    data-tutorial={groupTemplateName.trim() ? 'template-group-name-target' : 'template-group-save-confirm'}
                    className={`flex-1 px-2 py-1 text-xs bg-theme-accent text-theme-paper rounded hover:bg-theme-accent/80 transition-colors ${shouldHighlightGroupTemplateConfirm ? 'ring-4 ring-blue-500 ring-offset-1 font-bold' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      saveGroupTemplate();
                    }}
                  >
                    Save
                  </button>
                </Tooltip>
                <Tooltip content="Cancel group template creation" placement="left">
                  <button
                    className="flex-1 px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGroupTemplateNameInput(false);
                      setGroupTemplateName('');
                    }}
                  >
                    Cancel
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
          {hasMultipleSheets && (
            !showGroupMoveToSheet ? (
              <Tooltip content="Move this whole group to another sheet" placement="left">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGroupMoveToSheet(true);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                  Move to Sheet
                </button>
              </Tooltip>
            ) : (
              <div className="px-2 py-2">
                <div className="text-xs text-theme-muted mb-2">Move group to:</div>
                {sheets
                  .filter((sheet) => sheet.id !== activeSheetId)
                  .map((sheet) => (
                    <Tooltip key={sheet.id} content={`Move this group to ${sheet.name}`} placement="left">
                      <button
                        className="w-full px-2 py-1.5 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors rounded mb-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveGroupToSheet(widget.groupId!, sheet.id);
                          onClose();
                        }}
                      >
                        {sheet.name}
                      </button>
                    </Tooltip>
                  ))}
                <Tooltip content="Cancel moving this group" placement="left">
                  <button
                    className="w-full px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGroupMoveToSheet(false);
                    }}
                  >
                    Cancel
                  </button>
                </Tooltip>
              </div>
            )
          )}
          <Tooltip content="Break apart this group into individual widgets" placement="left">
            <button
              className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                detachAllInGroup(widget.groupId!);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
              Detach All
            </button>
          </Tooltip>
          <div className="border-t border-theme-border" />
          {!showGroupDeleteConfirm ? (
            <Tooltip content="Delete every widget in this group" placement="left">
              <button
                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGroupDeleteConfirm(true);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                Delete Group ({groupWidgets.length})
              </button>
            </Tooltip>
          ) : (
            <div className="flex">
              <Tooltip content="Confirm group deletion" placement="left">
                <button
                  className="flex-1 px-3 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    removeGroup(widget.groupId!);
                  }}
                >
                  Confirm
                </button>
              </Tooltip>
              <Tooltip content="Cancel group deletion" placement="left">
                <button
                  className="flex-1 px-3 py-2 text-sm text-theme-muted hover:bg-theme-accent hover:text-theme-paper transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGroupDeleteConfirm(false);
                  }}
                >
                  Cancel
                </button>
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
