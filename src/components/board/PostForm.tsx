"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor, RichTextEditorHandle } from "./RichTextEditor";

interface ExistingAttachment {
  id: string;
  filename: string;
  filepath: string;
  fileType: string;
}

interface PostFormProps {
  post?: { id: string; title: string; content: string };
  existingAttachments?: ExistingAttachment[];
  isEdit?: boolean;
}

export function PostForm({ post, existingAttachments = [], isEdit }: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [contentHtml, setContentHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<RichTextEditorHandle>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }

    const payload = editorRef.current?.getContentForSubmit();
    const html = payload?.html ?? contentHtml;
    const inlineFiles = payload?.files ?? [];
    const hasExisting = existingAttachments.length > 0;
    const isEmpty = !html?.replace(/<p><\/p>/g, "").replace(/<p>\s*<\/p>/g, "").trim();
    if (isEmpty && inlineFiles.length === 0 && !hasExisting) {
      setError("내용을 입력하거나 이미지를 넣어 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", html);
      inlineFiles.forEach((file) => formData.append("attachments", file));

      const url = isEdit && post?.id ? `/api/posts/${post.id}` : "/api/posts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const data = await res.json();
      router.push(`/board/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    editorRef.current?.insertImages(files);
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          placeholder="제목을 입력하세요"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          내용 (이미지를 커서 위치에 넣을 수 있습니다)
        </label>
        <RichTextEditor
          ref={editorRef}
          initialContent={post?.content}
          placeholder="내용을 입력하세요. Ctrl+V로 이미지 붙여넣기, 또는 아래에서 이미지 파일 선택. YouTube/Vimeo URL도 붙여넣기 가능."
          onChange={setContentHtml}
        />
        <p className="mt-2 text-xs text-stone-500">
          이미지: Ctrl+V 클립보드 붙여넣기, 드래그 앤 드롭, 또는 아래에서 파일 선택
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="mt-2 w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-medium hover:file:bg-amber-100"
        />
      </div>

      {existingAttachments.length > 0 && isEdit && (
        <div className="p-3 bg-stone-50 rounded-lg">
          <p className="text-sm text-stone-600 mb-2">기존 첨부 ({existingAttachments.length}개) - 수정 시 유지됩니다</p>
          <div className="flex flex-wrap gap-3">
            {existingAttachments.map((att) => (
              <div key={att.id} className="flex flex-col items-center gap-1">
                {att.fileType.startsWith("image/") ? (
                  <img src={att.filepath} alt={att.filename} className="h-20 w-20 object-cover rounded-lg border border-stone-200" />
                ) : (
                  <div className="h-20 w-20 rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center text-xs text-stone-500">
                    파일
                  </div>
                )}
                <span className="max-w-[80px] truncate text-xs text-stone-500">{att.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
        >
          {submitting ? "저장 중..." : isEdit ? "수정 완료" : "등록하기"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 font-medium"
        >
          취소
        </button>
      </div>
    </form>
  );
}
