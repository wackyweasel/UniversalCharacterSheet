import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useRef, useEffect, useCallback, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
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
}

export default function TextWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const [isContentEditing, setIsContentEditing] = useState(false);
  const showEditor = mode === 'edit' || (isContentEditing && mode !== 'print');
  const { label, text = '', richText } = widget.data;
  const widgetRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const initialContent = richText ?? plainTextToHtml(text);
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
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
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive('bold') ?? false,
      italic: currentEditor?.isActive('italic') ?? false,
      underline: currentEditor?.isActive('underline') ?? false,
      strike: currentEditor?.isActive('strike') ?? false,
      bulletList: currentEditor?.isActive('bulletList') ?? false,
      orderedList: currentEditor?.isActive('orderedList') ?? false,
      color: currentEditor?.getAttributes('textStyle').color as string | undefined,
      canIndent: currentEditor?.can().sinkListItem('listItem') ?? false,
      canOutdent: currentEditor?.can().liftListItem('listItem') ?? false,
    }),
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

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(showEditor);
  }, [editor, showEditor]);

  useEffect(() => {
    if (!isContentEditing || mode === 'edit') return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!widgetRef.current?.contains(event.target as Node)) setIsContentEditing(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isContentEditing, mode]);

  useEffect(() => {
    if (!isContentEditing || !editor || editor.isDestroyed) return;
    const frame = window.requestAnimationFrame(() => editor.commands.focus('end'));
    return () => window.cancelAnimationFrame(frame);
  }, [editor, isContentEditing]);

  useEffect(() => {
    if (mode === 'print') setIsContentEditing(false);
  }, [mode]);

  return (
    <div ref={widgetRef} className={`flex flex-col ${gapClass} w-full ${isAutoHeight ? '' : 'h-full'}`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}
      <div className={`notes-rich-text ${isAutoHeight ? 'notes-rich-text--auto' : 'flex-1 min-h-0'}`}>
        {mode !== 'print' && editor && (
          <div className="notes-rich-text__toolbar" role="toolbar" aria-label="Text formatting">
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
          </div>
        )}
        <div
          ref={editorScrollRef}
          className={`notes-rich-text__scroll ${!showEditor && mode !== 'print' ? 'cursor-text' : ''}`}
          role={!showEditor && mode !== 'print' ? 'button' : undefined}
          tabIndex={!showEditor && mode !== 'print' ? 0 : undefined}
          aria-label={!showEditor && mode !== 'print' ? `Edit ${label || 'notes'}` : undefined}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => { if (!showEditor && mode !== 'print') setIsContentEditing(true); }}
          onKeyDown={(event) => {
            if (!showEditor && mode !== 'print' && (event.key === 'Enter' || event.key === ' ')) {
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
            <span className="notes-rich-text__placeholder">Enter text here...</span>
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






