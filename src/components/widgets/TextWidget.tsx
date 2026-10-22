import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  BoldIcon,
  ClearFormattingIcon,
  IndentIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  OutdentIcon,
  PaletteIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '../icons';
import { Tooltip } from '../Tooltip';
import { InlineDiceRichText } from '../InlineDiceRichText';
import { v4 as uuidv4 } from 'uuid';
import {
  addNoteTab,
  getActiveNoteContent,
  getActiveNoteTab,
  getNoteContentUpdate,
  getNoteTabs,
  hasNoteContent,
  removeNoteTabs,
  renameNoteTab,
} from '../../utils/noteTabs';
import { SelectionActions } from './StructureDialogControls';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  sheetScale?: number;
  showFieldControls?: boolean;
}

interface ToolbarPosition {
  left: number;
  top: number;
}

export default function TextWidget({ widget, height, sheetScale = 1, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const [isContentEditing, setIsContentEditing] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const showEditor = isContentEditing && mode !== 'print';
  const canEditContent = !showEditor && mode !== 'print';
  const [renamingTab, setRenamingTab] = useState<{ id: string; name: string } | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const { label } = widget.data;
  const noteTabs = getNoteTabs(widget.data);
  const activeTab = getActiveNoteTab(widget.data);
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && mode !== 'print';
  const { text = '', richText } = getActiveNoteContent(widget.data);
  const showTabBar = mode !== 'print' && noteTabs.length > 0;
  const widgetRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const widgetDataRef = useRef(widget.data);
  widgetDataRef.current = widget.data;
  const isCommittingRenameRef = useRef(false);
  const tabScrollDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; scale: number; moved: boolean } | null>(null);
  const suppressTabClickRef = useRef(false);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  const initialContent = richText ?? plainTextToHtml(text);
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize, Color],
    content: initialContent,
    editable: showEditor,
    editorProps: {
      attributes: {
        class: 'notes-rich-text__content',
        'aria-label': label ? `${label} notes` : 'Notes',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.isDestroyed) return;
      updateWidgetData(widget.id, getNoteContentUpdate(widgetDataRef.current, {
        richText: currentEditor.getHTML(),
        text: currentEditor.getText({ blockSeparator: '\n' }),
      }));
    },
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor || currentEditor.isDestroyed) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          bulletList: false,
          orderedList: false,
          hasList: false,
          fontSize: undefined,
          color: undefined,
          canIndent: false,
          canOutdent: false,
        };
      }

      return {
        bold: currentEditor.isActive('bold'),
        italic: currentEditor.isActive('italic'),
        underline: currentEditor.isActive('underline'),
        strike: currentEditor.isActive('strike'),
        bulletList: currentEditor.isActive('bulletList'),
        orderedList: currentEditor.isActive('orderedList'),
        hasList: /<(ul|ol)>/.test(currentEditor.getHTML()),
        fontSize: currentEditor.getAttributes('textStyle').fontSize as string | undefined,
        color: currentEditor.getAttributes('textStyle').color as string | undefined,
        canIndent: currentEditor.can().sinkListItem('listItem'),
        canOutdent: currentEditor.can().liftListItem('listItem'),
      };
    },
  });

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const editorScroll = e.currentTarget;
    const isScrollable = editorScroll.scrollHeight > editorScroll.clientHeight;
    
    if (isScrollable) {
      e.stopPropagation();
    }
  }, []);

  const runEditorCommand = useCallback((command: () => void) => {
    if (!editor || editor.isDestroyed || mode === 'print') return;
    editor.setEditable(true);
    setIsContentEditing(true);
    window.requestAnimationFrame(command);
  }, [editor, mode]);

  const gapClass = 'gap-1';
  const isAutoHeight = height >= 10000;

  const updateToolbarPosition = useCallback(() => {
    const editorSurface = editorScrollRef.current;
    const toolbar = toolbarRef.current;
    if (!editorSurface || !toolbar) return;

    const margin = 8;
    const editorRect = editorSurface.getBoundingClientRect();
    // Sit outside the whole widget so the header and tab bar stay visible while typing.
    const frame = widgetRef.current?.closest<HTMLElement>('[data-widget-id]') ?? widgetRef.current;
    const frameRect = frame?.getBoundingClientRect() ?? editorRect;
    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;
    const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - toolbarHeight - margin);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const left = clamp(editorRect.right - toolbarWidth, margin, maxLeft);
    const aboveTop = frameRect.top - toolbarHeight - margin;
    const belowTop = frameRect.bottom + margin;
    const top = aboveTop >= margin ? aboveTop : clamp(belowTop, margin, maxTop);

    setToolbarPosition((currentPosition) => (
      currentPosition?.left === left && currentPosition.top === top
        ? currentPosition
        : { left, top }
    ));
  }, []);

  const isWithinEditingSurface = (target: EventTarget | null) => {
    if (!(target instanceof Node)) return false;
    return Boolean(editorScrollRef.current?.contains(target) || toolbarRef.current?.contains(target));
  };

  const handleTextFocus = () => {
    if (mode !== 'print') setIsToolbarVisible(true);
  };

  const handleTextBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!isWithinEditingSurface(event.relatedTarget)) setIsToolbarVisible(false);
  };

  useLayoutEffect(() => {
    if (!isToolbarVisible || mode === 'print') {
      setToolbarPosition(null);
      return;
    }

    updateToolbarPosition();
    const resizeObserver = new ResizeObserver(updateToolbarPosition);
    if (editorScrollRef.current) resizeObserver.observe(editorScrollRef.current);
    if (toolbarRef.current) resizeObserver.observe(toolbarRef.current);
    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);
    let frame = window.requestAnimationFrame(function refreshToolbarPosition() {
      updateToolbarPosition();
      frame = window.requestAnimationFrame(refreshToolbarPosition);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateToolbarPosition);
      window.removeEventListener('scroll', updateToolbarPosition, true);
    };
  }, [editor, isToolbarVisible, mode, sheetScale, updateToolbarPosition]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(showEditor);
  }, [editor, showEditor]);

  useEffect(() => {
    if (!isContentEditing && !isToolbarVisible) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!editorScrollRef.current?.contains(target) && !toolbarRef.current?.contains(target)) {
        setIsContentEditing(false);
        setIsToolbarVisible(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isContentEditing, isToolbarVisible]);

  useEffect(() => {
    if (!isContentEditing || !editor || editor.isDestroyed) return;
    const frame = window.requestAnimationFrame(() => editor.commands.focus('end'));
    return () => window.cancelAnimationFrame(frame);
  }, [editor, isContentEditing]);

  useEffect(() => {
    if (mode === 'print') {
      setIsContentEditing(false);
      setIsToolbarVisible(false);
      setRenamingTab(null);
      setShowRemoveDialog(false);
    }
  }, [mode]);

  const selectTab = (tabId: string) => {
    if (tabId !== activeTab?.id) updateWidgetData(widget.id, { activeNoteTabId: tabId });
  };

  const startRenamingTab = (tabId: string, name: string) => {
    isCommittingRenameRef.current = false;
    setIsContentEditing(false);
    setRenamingTab({ id: tabId, name });
  };

  const focusTab = (tabId: string) => {
    window.requestAnimationFrame(() => tabListRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${tabId}"]`)?.focus());
  };

  const commitRename = () => {
    if (!renamingTab || isCommittingRenameRef.current) return;
    isCommittingRenameRef.current = true;
    setRenamingTab(null);
    const tab = getNoteTabs(widgetDataRef.current).find((candidate) => candidate.id === renamingTab.id);
    if (tab && renamingTab.name.trim() && renamingTab.name.trim() !== tab.name) {
      updateWidgetData(widget.id, renameNoteTab(widgetDataRef.current, tab.id, renamingTab.name));
    }
  };

  const cancelRename = () => {
    isCommittingRenameRef.current = true;
    setRenamingTab(null);
  };

  // New tabs get a default name right away and open in rename mode, so naming is optional.
  const addTab = () => {
    const tabId = uuidv4();
    const update = addNoteTab(widgetDataRef.current, '', tabId);
    updateWidgetData(widget.id, update);
    startRenamingTab(tabId, update.noteTabs?.find((tab) => tab.id === tabId)?.name ?? '');
  };

  const openRemoveDialog = () => {
    setSelectedTabIds(new Set());
    setIsConfirmingRemoval(false);
    setIsContentEditing(false);
    setShowRemoveDialog(true);
  };

  const closeRemoveDialog = () => {
    setSelectedTabIds(new Set());
    setIsConfirmingRemoval(false);
    setShowRemoveDialog(false);
  };

  const updateTabSelection = (next: Set<string>) => {
    setSelectedTabIds(next);
    setIsConfirmingRemoval(false);
  };

  const toggleTabSelection = (tabId: string) => {
    const next = new Set(selectedTabIds);
    if (next.has(tabId)) next.delete(tabId);
    else next.add(tabId);
    updateTabSelection(next);
  };

  const selectedTabsWithNotes = noteTabs.filter((tab) => selectedTabIds.has(tab.id) && hasNoteContent(tab));

  const removeSelectedTabs = () => {
    if (selectedTabIds.size === 0) return;
    if (selectedTabsWithNotes.length > 0 && !isConfirmingRemoval) {
      setIsConfirmingRemoval(true);
      return;
    }
    updateWidgetData(widget.id, removeNoteTabs(widgetDataRef.current, selectedTabIds));
    closeRemoveDialog();
  };

  useEffect(() => {
    if (!showRemoveDialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRemoveDialog();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRemoveDialog]);

  const activeTabId = activeTab?.id;
  useEffect(() => {
    const list = tabListRef.current;
    const tab = activeTabId ? list?.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`) : null;
    if (!list || !tab) return;
    if (tab.offsetLeft < list.scrollLeft) {
      list.scrollLeft = tab.offsetLeft;
    } else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
    }
  }, [activeTabId, noteTabs.length]);

  const [canScrollTabs, setCanScrollTabs] = useState(false);
  const measureTabOverflow = useCallback(() => {
    const list = tabListRef.current;
    setCanScrollTabs(Boolean(list && list.scrollWidth > list.clientWidth + 1));
  }, []);
  useLayoutEffect(measureTabOverflow);
  useEffect(() => {
    const list = tabListRef.current;
    if (!showTabBar || !list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureTabOverflow);
    observer.observe(list);
    return () => observer.disconnect();
  }, [showTabBar, measureTabOverflow]);

  const handleTabListPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (!canScrollTabs || (event.target as HTMLElement).closest('input')) return;
    // The sheet may be zoomed, so convert screen pixels to the list's own pixels.
    const scale = list.getBoundingClientRect().width / list.offsetWidth || 1;
    tabScrollDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: list.scrollLeft, scale, moved: false };
  };

  const handleTabListPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = tabScrollDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(deltaX) < 4) return;
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDraggingTabs(true);
    }
    event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX / drag.scale;
  };

  const endTabListDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = tabScrollDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    tabScrollDragRef.current = null;
    if (!drag.moved) return;
    setIsDraggingTabs(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // Swallow the click that follows a drag so the tab under the pointer isn't selected.
    suppressTabClickRef.current = true;
    window.setTimeout(() => { suppressTabClickRef.current = false; }, 0);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'F2') {
      event.preventDefault();
      startRenamingTab(noteTabs[index].id, noteTabs[index].name);
      return;
    }
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!offset || noteTabs.length < 2) return;
    event.preventDefault();
    const nextTab = noteTabs[(index + offset + noteTabs.length) % noteTabs.length];
    selectTab(nextTab.id);
    const tabList = event.currentTarget.parentElement;
    window.requestAnimationFrame(() => tabList?.querySelector<HTMLButtonElement>(`[data-tab-id="${nextTab.id}"]`)?.focus());
  };

  const removeDialogTitleId = `notes-remove-tabs-title-${widget.id}`;

  return (
    <div ref={widgetRef} className={`flex flex-col ${gapClass} w-full ${isAutoHeight ? '' : 'h-full'}`}>
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && (
            <div className="widget-structure-title min-w-0 flex-1 truncate">
              <InlineFormulaText text={label} />
            </div>
          )}
          {controlsVisible && (
            <div className="widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={noteTabs.length > 0 ? 'Choose tabs to remove' : 'No tabs to remove'}>
                <button
                  type="button"
                  onClick={openRemoveDialog}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={noteTabs.length === 0}
                  aria-label="Choose note tabs to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add tab">
                <button
                  type="button"
                  onClick={addTab}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add note tab"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
      {showTabBar && (
        <div className="notes-tabs flex-shrink-0" data-camera-pan-ignore="true">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label={label ? `${label} tabs` : 'Notes tabs'}
            className={`notes-tabs__list ${isDraggingTabs ? 'notes-tabs__list--dragging' : ''}`}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={handleTabListPointerDown}
            onPointerMove={handleTabListPointerMove}
            onPointerUp={endTabListDrag}
            onPointerCancel={endTabListDrag}
            onClickCapture={(event) => {
              if (!suppressTabClickRef.current) return;
              suppressTabClickRef.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {noteTabs.map((tab, index) => {
              const isActive = tab.id === activeTab?.id;
              if (renamingTab?.id === tab.id) {
                return (
                  <input
                    key={tab.id}
                    autoFocus
                    type="text"
                    data-tab-id={tab.id}
                    className="notes-tabs__input"
                    aria-label="Tab name"
                    placeholder={tab.name}
                    maxLength={60}
                    value={renamingTab.name}
                    onChange={(event) => setRenamingTab({ id: tab.id, name: event.target.value })}
                    onFocus={(event) => event.currentTarget.select()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === 'Enter') {
                        commitRename();
                        focusTab(tab.id);
                      }
                      if (event.key === 'Escape') {
                        cancelRename();
                        focusTab(tab.id);
                      }
                    }}
                    onBlur={commitRename}
                  />
                );
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-tab-id={tab.id}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  title={`${tab.name} (double-click to rename)`}
                  className={`notes-tabs__tab ${isActive ? 'notes-tabs__tab--active' : ''}`}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() => selectTab(tab.id)}
                  onDoubleClick={() => startRenamingTab(tab.id, tab.name)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        className={`notes-rich-text ${isAutoHeight ? 'notes-rich-text--auto' : 'flex-1 min-h-0'}`}
        role={noteTabs.length > 0 ? 'tabpanel' : undefined}
        aria-label={noteTabs.length > 0 ? activeTab?.name : undefined}
      >
        {isToolbarVisible && mode !== 'print' && editor && createPortal(
          <div
            ref={toolbarRef}
            className="notes-rich-text__toolbar"
            role="toolbar"
            aria-label="Text formatting"
            style={{
              left: toolbarPosition?.left ?? 0,
              top: toolbarPosition?.top ?? 0,
              visibility: toolbarPosition ? 'visible' : 'hidden',
            }}
            onFocus={handleTextFocus}
            onBlur={handleTextBlur}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <ToolbarButton label="Bold" active={toolbarState?.bold} onClick={() => runEditorCommand(() => editor.chain().focus().toggleBold().run())}>
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={toolbarState?.italic} onClick={() => runEditorCommand(() => editor.chain().focus().toggleItalic().run())}>
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton label="Underline" active={toolbarState?.underline} onClick={() => runEditorCommand(() => editor.chain().focus().toggleUnderline().run())}>
              <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" active={toolbarState?.strike} onClick={() => runEditorCommand(() => editor.chain().focus().toggleStrike().run())}>
              <StrikethroughIcon />
            </ToolbarButton>
            <label className="notes-rich-text__font-size" aria-label="Font size">
              <span className="sr-only">Font size</span>
              <select
                aria-label="Font size"
                value={toolbarState?.fontSize ?? ''}
                onChange={(event) => {
                  const fontSize = event.target.value;
                  runEditorCommand(() => {
                    if (fontSize) {
                      editor.chain().focus().setFontSize(fontSize).run();
                    } else {
                      editor.chain().focus().unsetFontSize().run();
                    }
                  });
                }}
              >
                <option value="">Default</option>
                <option value="0.5rem">8 px</option>
                <option value="0.625rem">10 px</option>
                <option value="0.75rem">12 px</option>
                <option value="0.875rem">14 px</option>
                <option value="1rem">16 px</option>
                <option value="1.25rem">20 px</option>
                <option value="1.5rem">24 px</option>
                <option value="2rem">32 px</option>
              </select>
            </label>
            <div className="notes-rich-text__divider" />
            <Tooltip content="Text color">
              <label className="notes-rich-text__color" aria-label="Text color">
                <PaletteIcon />
                <span style={{ backgroundColor: toolbarState?.color ?? 'var(--color-ink)' }} />
                <input
                  type="color"
                  value={normalizeColor(toolbarState?.color)}
                  onChange={(event) => {
                    const color = event.target.value;
                    runEditorCommand(() => editor.chain().focus().setColor(color).run());
                  }}
                />
              </label>
            </Tooltip>
            <div className="notes-rich-text__divider" />
            <ToolbarButton label="Bullet list" active={toolbarState?.bulletList} onClick={() => runEditorCommand(() => editor.chain().focus().toggleBulletList().run())}>
              <ListIcon />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={toolbarState?.orderedList} onClick={() => runEditorCommand(() => editor.chain().focus().toggleOrderedList().run())}>
              <ListOrderedIcon />
            </ToolbarButton>
            <ToolbarButton label="Decrease indent" disabled={!toolbarState?.canOutdent} onClick={() => runEditorCommand(() => editor.chain().focus().liftListItem('listItem').run())}>
              <OutdentIcon />
            </ToolbarButton>
            <ToolbarButton label="Increase indent" disabled={!toolbarState?.canIndent} onClick={() => runEditorCommand(() => editor.chain().focus().sinkListItem('listItem').run())}>
              <IndentIcon />
            </ToolbarButton>
            <div className="notes-rich-text__divider" />
            <ToolbarButton label="Clear formatting" onClick={() => runEditorCommand(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>
              <ClearFormattingIcon />
            </ToolbarButton>
          </div>,
          document.body,
        )}
        <div
          ref={editorScrollRef}
          className={`notes-rich-text__scroll ${canEditContent || showEditor ? 'cursor-text' : ''}`}
          role={canEditContent ? 'button' : undefined}
          tabIndex={canEditContent ? 0 : undefined}
          aria-label={canEditContent ? `Edit ${label || 'notes'}` : undefined}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (canEditContent) {
              setIsContentEditing(true);
              setIsToolbarVisible(true);
            }
          }}
          onKeyDown={(event) => {
            if (canEditContent && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setIsContentEditing(true);
            }
          }}
          onWheel={handleWheel}
        >
          {showEditor ? (
            <EditorContent editor={editor} />
          ) : (
            <div
              className={`notes-rich-text__content ${mode === 'print' ? '' : 'notes-rich-text__content--preview'}`}
              aria-label={label ? `${label} notes` : 'Notes'}
            >
              <InlineDiceRichText html={initialContent} widget={widget} />
            </div>
          )}
          {showEditor && editor?.isEmpty && (
            <span className={`notes-rich-text__placeholder ${toolbarState?.hasList ? 'notes-rich-text__placeholder--list' : ''}`}>
              Enter text here...
            </span>
          )}
        </div>
      </div>

      {showRemoveDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeRemoveDialog}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={removeDialogTitleId}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={removeDialogTitleId} className="font-heading text-base font-bold">
              Remove tabs
            </h3>
            <p className="mt-3 text-sm text-theme-muted">Select one or more tabs to remove.</p>
            <SelectionActions
              onCheckAll={() => updateTabSelection(new Set(noteTabs.map((tab) => tab.id)))}
              onUncheckAll={() => updateTabSelection(new Set())}
            />
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {noteTabs.map((tab) => (
                <label
                  key={tab.id}
                  className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                >
                  <input
                    type="checkbox"
                    checked={selectedTabIds.has(tab.id)}
                    onChange={() => toggleTabSelection(tab.id)}
                    className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0 flex-1 truncate">{tab.name}</span>
                  {hasNoteContent(tab) && <span className="flex-shrink-0 text-xs opacity-70">has notes</span>}
                </label>
              ))}
            </div>
            {isConfirmingRemoval && (
              <p role="alert" className="mt-3 rounded-button border border-red-600 bg-red-600/10 px-3 py-2 text-sm text-theme-ink">
                {selectedTabsWithNotes.length === 1
                  ? <>The notes in <strong>{selectedTabsWithNotes[0].name}</strong> will be lost.</>
                  : <>The notes in {selectedTabsWithNotes.length} tabs will be lost: <strong>{selectedTabsWithNotes.map((tab) => tab.name).join(', ')}</strong>.</>}
                {' '}Remove anyway?
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" autoFocus onClick={closeRemoveDialog} className="widget-control px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={removeSelectedTabs}
                disabled={selectedTabIds.size === 0}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isConfirmingRemoval ? 'Remove anyway' : `Remove${selectedTabIds.size > 0 ? ` (${selectedTabIds.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={`notes-rich-text__button ${active ? 'notes-rich-text__button--active' : ''}`}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function plainTextToHtml(text: string) {
  if (!text) return '';

  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeColor(color?: string) {
  return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : '#000000';
}






