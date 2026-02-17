"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostFormProps {
  post?: { id: string; title: string; content: string };
  isEdit?: boolean;
}

// isEdit not used - no PUT handler yet

export function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await fetch("/api/posts", { method: "POST", body: formData });

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
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[200px]"
          placeholder="내용을 입력하세요. 이미지나 유튜브 링크를 붙여넣을 수 있습니다."
          maxLength={10000}
        />
        <p className="mt-2 text-xs text-stone-500">
          동영상: YouTube, Vimeo 등 URL 붙여넣기 | 이미지: URL 또는 아래에서
          첨부
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          첨부파일
        </label>
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
          <ul className="mt-2 space-y-1">
            {attachments.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-stone-600"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-red-600 hover:text-red-700"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
        >
          {submitting ? "저장 중..." : "등록하기"}
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
