"use client";

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import FileHandler from "@tiptap/extension-file-handler";

export interface RichTextEditorHandle {
  insertImages: (files: File[]) => void;
  getContentForSubmit: () => { html: string; files: File[] } | null;
}

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  onInlineFilesChange?: (files: File[]) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  {
    initialContent = "",
    placeholder = "내용을 입력하세요. Ctrl+V로 이미지 붙여넣기, 이미지 드래그 앤 드롭 가능.",
    onChange,
    onInlineFilesChange,
  },
  ref
) {
  const blobToFile = useRef<Map<string, File>>(new Map());

  const insertImagesAtCursor = useCallback(
    (editor: Editor | null, files: File[]) => {
      if (!editor) return;
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      for (const file of imageFiles) {
        const blobUrl = URL.createObjectURL(file);
        blobToFile.current.set(blobUrl, file);
        editor.chain().focus().insertContent({ type: "image", attrs: { src: blobUrl } }).run();
      }
      onInlineFilesChange?.(Array.from(blobToFile.current.values()));
    },
    [onInlineFilesChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: true, HTMLAttributes: { class: "max-w-full rounded-lg border border-stone-200 max-h-80 object-contain" } }),
      Placeholder.configure({ placeholder }),
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        onPaste: (ed, files) => {
          insertImagesAtCursor(ed, files);
        },
        onDrop: (ed, files, pos) => {
          if (!ed) return;
          const imageFiles = files.filter((f) => f.type.startsWith("image/"));
          for (const file of imageFiles) {
            const blobUrl = URL.createObjectURL(file);
            blobToFile.current.set(blobUrl, file);
            ed.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: blobUrl } }).run();
          }
          onInlineFilesChange?.(Array.from(blobToFile.current.values()));
        },
      }),
    ],
    content: (() => {
      if (!initialContent?.trim()) return undefined;
      if (initialContent.trim().startsWith("<")) return initialContent;
      return "<p>" + initialContent.replace(/\n/g, "</p><p>") + "</p>";
    })(),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-stone max-w-none min-h-[200px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const insertImages = useCallback(
    (files: File[]) => {
      if (editor) insertImagesAtCursor(editor, files);
    },
    [editor, insertImagesAtCursor]
  );

  const getContentForSubmit = useCallback(() => {
    if (!editor) return null;
    let html = editor.getHTML();
    const files: File[] = [];
    const blobRegex = /src="(blob:[^"]+)"/g;
    const matches = [...html.matchAll(blobRegex)];
    let idx = 0;
    for (const m of matches) {
      const blobUrl = m[1];
      const file = blobToFile.current.get(blobUrl);
      if (file) {
        files.push(file);
        html = html.replace(`src="${blobUrl}"`, `src="{{INLINE_${idx}}}"`);
        idx++;
      }
    }
    return { html, files };
  }, [editor]);

  useImperativeHandle(ref, () => ({ insertImages, getContentForSubmit }), [insertImages, getContentForSubmit]);

  if (!editor) {
    return (
      <div className="w-full min-h-[200px] rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-500 text-sm">
        에디터 로딩 중...
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-stone-200 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent overflow-hidden">
      <EditorContent editor={editor} />
    </div>
  );
});
