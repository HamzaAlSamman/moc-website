"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useCallback } from "react";

const ToolbarButton = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rounded px-2 py-1 text-sm transition ${
      active
        ? "bg-amber-500 text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    } disabled:opacity-40`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange, placeholder = "اكتب هنا...", dir = "rtl" }) {
  const [selectionTick, setSelectionTick] = useState(0);
  const forceUpdate = useCallback(() => setSelectionTick(t => t + 1), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-[250px] p-4 outline-none prose prose-sm max-w-none",
        dir,
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    onSelectionUpdate() {
      forceUpdate();
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  const isAlignActive = (alignment) => {
    if (!editor) return false;
    if (editor.isActive({ textAlign: alignment })) return true;
    const hasAlign =
      editor.isActive({ textAlign: "left" }) ||
      editor.isActive({ textAlign: "center" }) ||
      editor.isActive({ textAlign: "right" }) ||
      editor.isActive({ textAlign: "justify" });
    if (!hasAlign) {
      return alignment === (dir === "rtl" ? "right" : "left");
    }
    return false;
  };

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 p-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <u>U</u>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          "
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={isAlignActive("right")}
          title="Align Right"
        >
          ⇒
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={isAlignActive("center")}
          title="Align Center"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={isAlignActive("left")}
          title="Align Left"
        >
          ⇐
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={isAlignActive("justify")}
          title="Align Justify"
        >
          ⇔
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          onClick={() => {
            const url = window.prompt ? window.prompt("رابط URL:") : "";
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Link"
        >
          🔗
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
