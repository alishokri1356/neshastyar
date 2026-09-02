import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const looksLikeHtml = (value: string) => /<\/?[a-z][^>]*>/i.test(value);

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Convert plain text (with newlines) to simple HTML paragraphs for the editor. */
const plainTextToHtml = (text: string): string => {
  if (!text.trim()) return '';
  if (looksLikeHtml(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).split('\n').join('<br>')}</p>`)
    .join('');
};

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton = ({ onClick, active, disabled, label, children }: ToolbarButtonProps) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
      'hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
      active ? 'bg-muted text-foreground' : 'text-muted-foreground'
    )}
  >
    {children}
  </button>
);

const EditorToolbar = ({ editor }: { editor: Editor }) => (
  <div
    className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5"
    dir="rtl"
  >
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBold().run()}
      active={editor.isActive('bold')}
      label="پررنگ"
    >
      <Bold className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleItalic().run()}
      active={editor.isActive('italic')}
      label="مورب"
    >
      <Italic className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleStrike().run()}
      active={editor.isActive('strike')}
      label="خط‌خورده"
    >
      <Strikethrough className="h-4 w-4" />
    </ToolbarButton>

    <span className="mx-1 h-5 w-px bg-border" />

    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      active={editor.isActive('heading', { level: 2 })}
      label="سرفصل بزرگ"
    >
      <Heading2 className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      active={editor.isActive('heading', { level: 3 })}
      label="سرفصل کوچک"
    >
      <Heading3 className="h-4 w-4" />
    </ToolbarButton>

    <span className="mx-1 h-5 w-px bg-border" />

    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      active={editor.isActive('bulletList')}
      label="لیست نقطه‌ای"
    >
      <List className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      active={editor.isActive('orderedList')}
      label="لیست شماره‌دار"
    >
      <ListOrdered className="h-4 w-4" />
    </ToolbarButton>

    <span className="mx-1 h-5 w-px bg-border" />

    <ToolbarButton
      onClick={() => editor.chain().focus().undo().run()}
      disabled={!editor.can().undo()}
      label="واگرد"
    >
      <Undo2 className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      onClick={() => editor.chain().focus().redo().run()}
      disabled={!editor.can().redo()}
      label="ازنو"
    >
      <Redo2 className="h-4 w-4" />
    </ToolbarButton>
  </div>
);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor = ({ value, onChange, disabled, className }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: plainTextToHtml(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        dir: 'rtl',
        class: 'rich-text-body min-h-[200px] px-3 py-2 text-right text-sm text-foreground focus:outline-none',
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Sync external value changes (e.g. cancel/reset) without breaking the cursor mid-typing
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = plainTextToHtml(value);
    if (incoming !== current && !editor.isFocused) {
      editor.commands.setContent(incoming);
    }
  }, [editor, value]);

  return (
    <div
      dir="rtl"
      className={cn(
        'rich-text-editor overflow-hidden rounded-md border border-input bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-60',
        className
      )}
    >
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
