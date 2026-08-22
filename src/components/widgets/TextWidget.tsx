import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
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

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  sheetScale?: number;
}

interface ToolbarPosition {
  left: number;
  top: number;
}

export default function TextWidget({ widget, height, sheetScale = 1 }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const [isContentEditing, setIsContentEditing] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const showEditor = mode === 'edit' || (isContentEditing && mode !== 'print');
  const canEditContent = !showEditor && mode !== 'print';
  const { label, text = '', richText } = widget.data;
  const widgetRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

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
      updateWidgetData(widget.id, {
        richText: currentEditor.getHTML(),
        text: currentEditor.getText({ blockSeparator: '\n' }),
      });
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
    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;
    const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - toolbarHeight - margin);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const left = clamp(editorRect.right - toolbarWidth, margin, maxLeft);
    const aboveTop = editorRect.top - toolbarHeight - margin;
    const belowTop = editorRect.bottom + margin;
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
    }
  }, [mode]);

  return (
    <div ref={widgetRef} className={`flex flex-col ${gapClass} w-full ${isAutoHeight ? '' : 'h-full'}`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}
      <div className={`notes-rich-text ${isAutoHeight ? 'notes-rich-text--auto' : 'flex-1 min-h-0'}`}>
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
          className={`notes-rich-text__scroll ${canEditContent ? 'cursor-text' : ''}`}
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






