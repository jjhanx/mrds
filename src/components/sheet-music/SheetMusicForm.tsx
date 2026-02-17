"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PARTS = [
  { key: "soprano", label: "소프라노" },
  { key: "alto", label: "알토" },
  { key: "tenor", label: "테너" },
  { key: "bass", label: "베이스" },
  { key: "full", label: "전체" },
];

export function SheetMusicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [composer, setComposer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("악보 제목을 입력해 주세요.");
      return;
    }
    if (!file?.size && !fileUrl.trim()) {
      setError("악보 파일을 업로드하거나 URL을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("composer", composer);
      if (file?.size) formData.append("file", file);
      if (fileUrl.trim()) formData.append("fileUrl", fileUrl);
      PARTS.forEach(({ key }) => {
        if (videos[key]?.trim()) formData.append(`video_${key}`, videos[key]);
      });

      const res = await fetch("/api/sheet-music", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "등록에 실패했습니다.");
      }

      const data = await res.json();
      router.push(`/sheet-music/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
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
          악보 제목 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          placeholder="예: Amazing Grace"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          작곡가
        </label>
        <input
          type="text"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          placeholder="예: John Newton"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          설명
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[80px]"
          placeholder="추가 설명 (선택)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          악보 파일 *
        </label>
        <p className="text-xs text-stone-500 mb-2">
          PDF, 이미지 파일 업로드 또는 외부 URL 입력
        </p>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f || null);
            if (f) setFileUrl("");
          }}
          className="w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-medium mb-2"
        />
        <input
          type="url"
          value={fileUrl}
          onChange={(e) => {
            setFileUrl(e.target.value);
            if (e.target.value) setFile(null);
          }}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          placeholder="또는 악보 URL (예: Google Drive 링크)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          파트별 연습 영상 (선택)
        </label>
        <p className="text-xs text-stone-500 mb-3">
          YouTube 등 연습용 동영상 URL을 파트별로 입력하세요.
        </p>
        <div className="space-y-2">
          {PARTS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-20 text-sm text-stone-600">{label}</label>
              <input
                type="url"
                value={videos[key] || ""}
                onChange={(e) =>
                  setVideos((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="flex-1 px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                placeholder="YouTube URL"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
        >
          {submitting ? "등록 중..." : "등록하기"}
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
