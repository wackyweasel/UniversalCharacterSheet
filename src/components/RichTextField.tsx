import type { ReactNode } from 'react';
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
} from './icons';
import { Tooltip } from './Tooltip';

interface RichTextFieldProps {
  /** HTML content. Empty string when blank. */
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

function normalizeColor(color?: string) {
  return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : '#000000';
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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

/** Notes-style rich text editor (everything except font size) with an always-visible toolbar. */
export function RichTextField({ value, onChange, ariaLabel, placeholder = 'Enter text here...' }: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
    content: value,
    editorProps: {
      attributes: {
        class: 'notes-rich-text__content',
        'aria-label': ariaLabel,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor || currentEditor.isDestroyed) {
        return {
          bold: false, italic: false, underline: false, strike: false,
          bulletList: false, orderedList: false, hasList: false,
          color: undefined as string | undefined, canIndent: false, canOutdent: false, isEmpty: true,
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
        color: currentEditor.getAttributes('textStyle').color as string | undefined,
        canIndent: currentEditor.can().sinkListItem('listItem'),
        canOutdent: currentEditor.can().liftListItem('listItem'),
        isEmpty: currentEditor.isEmpty,
      };
    },
  });

  if (!editor) return null;

  return (
    <div className="notes-rich-text notes-rich-text--field">
      <div className="notes-rich-text__toolbar notes-rich-text__toolbar--inline" role="toolbar" aria-label="Text formatting">
        <ToolbarButton label="Bold" active={state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton label="Underline" active={state?.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" active={state?.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <StrikethroughIcon />
        </ToolbarButton>
        <div className="notes-rich-text__divider" />
        <Tooltip content="Text color">
          <label className="notes-rich-text__color" aria-label="Text color">
            <PaletteIcon />
            <span style={{ backgroundColor: state?.color ?? 'var(--color-ink)' }} />
            <input
              type="color"
              value={normalizeColor(state?.color)}
              onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            />
          </label>
        </Tooltip>
        <div className="notes-rich-text__divider" />
        <ToolbarButton label="Bullet list" active={state?.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListIcon />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={state?.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrderedIcon />
        </ToolbarButton>
        <ToolbarButton label="Decrease indent" disabled={!state?.canOutdent} onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
          <OutdentIcon />
        </ToolbarButton>
        <ToolbarButton label="Increase indent" disabled={!state?.canIndent} onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
          <IndentIcon />
        </ToolbarButton>
        <div className="notes-rich-text__divider" />
        <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <ClearFormattingIcon />
        </ToolbarButton>
      </div>
      <div
        className="notes-rich-text__scroll cursor-text"
        onClick={(event) => {
          if (event.target === event.currentTarget) editor.commands.focus('end');
        }}
      >
        <EditorContent editor={editor} />
        {state?.isEmpty && (
          <span className={`notes-rich-text__placeholder ${state.hasList ? 'notes-rich-text__placeholder--list' : ''}`}>
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}
