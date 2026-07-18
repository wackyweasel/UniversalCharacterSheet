import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useRef, useEffect, useCallback } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Palette,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function TextWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  const { label, text = '', richText } = widget.data;
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const initialContent = richText ?? plainTextToHtml(text);
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
    content: initialContent,
    editable: !isPrintMode,
    editorProps: {
      attributes: {
        class: 'notes-rich-text__content',
        'aria-label': label ? `${label} notes` : 'Notes',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
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

  const gapClass = 'gap-1';
  const isAutoHeight = height >= 10000;

  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  useEffect(() => {
    editor?.setEditable(!isPrintMode);
  }, [editor, isPrintMode]);

  return (
    <div className={`flex flex-col ${gapClass} w-full ${isAutoHeight ? '' : 'h-full'}`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}
      <div className={`notes-rich-text ${isAutoHeight ? 'notes-rich-text--auto' : 'flex-1 min-h-0'}`}>
        {!isPrintMode && editor && (
          <div className="notes-rich-text__toolbar" role="toolbar" aria-label="Text formatting">
            <ToolbarButton label="Bold" active={toolbarState?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={toolbarState?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic />
            </ToolbarButton>
            <ToolbarButton label="Underline" active={toolbarState?.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <Underline />
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" active={toolbarState?.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough />
            </ToolbarButton>
            <div className="notes-rich-text__divider" />
            <Tooltip content="Text color">
              <label className="notes-rich-text__color" aria-label="Text color">
                <Palette />
                <span style={{ backgroundColor: toolbarState?.color ?? 'var(--color-ink)' }} />
                <input
                  type="color"
                  value={normalizeColor(toolbarState?.color)}
                  onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
                />
              </label>
            </Tooltip>
            <div className="notes-rich-text__divider" />
            <ToolbarButton label="Bullet list" active={toolbarState?.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={toolbarState?.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered />
            </ToolbarButton>
            <ToolbarButton label="Decrease indent" disabled={!toolbarState?.canOutdent} onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
              <IndentDecrease />
            </ToolbarButton>
            <ToolbarButton label="Increase indent" disabled={!toolbarState?.canIndent} onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
              <IndentIncrease />
            </ToolbarButton>
            <div className="notes-rich-text__divider" />
            <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
              <RemoveFormatting />
            </ToolbarButton>
          </div>
        )}
        <div
          ref={editorScrollRef}
          className="notes-rich-text__scroll"
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={handleWheel}
        >
          <EditorContent editor={editor} />
          {!isPrintMode && editor?.isEmpty && (
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






