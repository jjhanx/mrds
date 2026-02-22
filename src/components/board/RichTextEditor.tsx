"use client";

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import FileHandler from "@tiptap/extension-file-handler";
import Youtube from "@tiptap/extension-youtube";
import { Vimeo } from "@/extensions/vimeo";
import { Video } from "@/extensions/video";

export interface RichTextEditorHandle {
  insertImages: (files: File[]) => void;
  insertMedia: (files: File[]) => void;
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
    placeholder = "내용 입력. Ctrl+V로 이미지·동영상 붙여넣기. YouTube·Vimeo URL 붙여넣으면 링크 삽입.",
    onChange,
    onInlineFilesChange,
  },
  ref
) {
  const blobToFile = useRef<Map<string, File>>(new Map());

  const insertMediaAtCursor = useCallback(
    (editor: Editor | null, files: File[], pos?: number) => {
      if (!editor) return;
      const mediaFiles = files.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      for (const file of mediaFiles) {
        const blobUrl = URL.createObjectURL(file);
        blobToFile.current.set(blobUrl, file);
        const node =
          file.type.startsWith("video/")
            ? { type: "video" as const, attrs: { src: blobUrl } }
            : { type: "image" as const, attrs: { src: blobUrl } };
        if (typeof pos === "number") {
          editor.chain().focus().insertContentAt(pos, node).run();
        } else {
          editor.chain().focus().insertContent(node).run();
        }
      }
      onInlineFilesChange?.(Array.from(blobToFile.current.values()));
    },
    [onInlineFilesChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: true, HTMLAttributes: { class: "max-w-full rounded-lg border border-stone-200 max-h-80 object-contain" } }),
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: "rounded-lg" } }),
      Vimeo.configure({ width: 640, height: 360 }),
      Video,
      Placeholder.configure({ placeholder }),
      FileHandler.configure({
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ],
        onPaste: (ed, files) => {
          insertMediaAtCursor(ed, files);
        },
        onDrop: (ed, files, pos) => {
          if (ed) insertMediaAtCursor(ed, files, pos);
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

  const insertMedia = useCallback(
    (files: File[]) => {
      if (editor) insertMediaAtCursor(editor, files);
    },
    [editor, insertMediaAtCursor]
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

  useImperativeHandle(
    ref,
    () => ({ insertImages: insertMedia, insertMedia, getContentForSubmit }),
    [insertMedia, getContentForSubmit]
  );

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
