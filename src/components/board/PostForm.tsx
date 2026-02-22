"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  const [content, setContent] = useState(post?.content || "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) setAttachments((prev) => [...prev, file]);
        break;
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    const hasExisting = existingAttachments.length > 0;
    if (!content.trim() && attachments.length === 0 && !hasExisting) {
      setError("내용을 입력하거나 이미지/파일을 첨부해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim() || "");
      attachments.forEach((file) => formData.append("attachments", file));

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
          내용 (이미지, 동영상 URL 붙여넣기 가능)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[200px]"
          placeholder="내용을 입력하세요. 이미지나 유튜브 링크를 붙여넣을 수 있습니다. Ctrl+V로 클립보드 이미지도 붙여넣기 가능합니다."
          maxLength={10000}
        />
        <p className="mt-2 text-xs text-stone-500">
          동영상: YouTube, Vimeo 등 URL 붙여넣기 | 이미지: URL 붙여넣기, Ctrl+V
          클립보드, 또는 아래 첨부
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          첨부파일
        </label>
        {existingAttachments.length > 0 && (
          <div className="mb-3 p-3 bg-stone-50 rounded-lg">
            <p className="text-sm text-stone-600 mb-2">기존 첨부 ({existingAttachments.length}개)</p>
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
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setAttachments((prev) => [...prev, ...files]);
          }}
          className="w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-medium hover:file:bg-amber-100"
        />
        {attachments.length > 0 && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-stone-600">첨부 예정 ({attachments.length}개)</p>
            <div className="flex flex-wrap gap-3">
              {attachments.map((f, i) => {
                const isImage = f.type.startsWith("image/");
                const previewUrl = isImage ? URL.createObjectURL(f) : null;
                return (
                  <div
                    key={i}
                    className="relative inline-flex flex-col items-center gap-1"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="h-20 w-20 object-cover rounded-lg border border-stone-200"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center text-xs text-stone-500">
                        파일
                      </div>
                    )}
                    <span className="max-w-[80px] truncate text-xs text-stone-500">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
