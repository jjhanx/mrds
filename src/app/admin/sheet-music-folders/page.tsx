"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, Pencil, Trash2, ArrowLeft, FolderPlus, Plus, Loader2, FileCode } from "lucide-react";
import { FORMAT_PRESETS, getFolderHint } from "@/constants/sheet-music";

interface FolderItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  allowedExts?: string | null;
  itemCount: number;
}

export default function AdminSheetMusicFoldersPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editAllowedExts, setEditAllowedExts] = useState("*");

  // 새 폴더 입력 상태
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newFormatPreset, setNewFormatPreset] = useState("all");
  const [newCustomExts, setNewCustomExts] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    fetch("/api/sheet-music/folders")
      .then((res) => res.json())
      .then((data) => {
        setFolders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // 폴더 이름에 따라 포맷 자동 추천 (예: mxl 입력 시 자동으로 MXL 프리셋 선택)
  const handleNameChange = (val: string) => {
    setNewName(val);
    const lower = val.toLowerCase();
    if (newFormatPreset === "all") {
      if (lower.includes("mxl") || lower.includes("musicxml")) {
        setNewFormatPreset("mxl");
      } else if (lower.includes("동영상") || lower.includes("video")) {
        setNewFormatPreset("video");
      } else if (lower.includes("nwc")) {
        setNewFormatPreset("nwc");
      } else if (lower.includes("음원") || lower.includes("오디오") || lower.includes("audio") || lower.includes("mp3")) {
        setNewFormatPreset("audio");
      }
    }
  };

  const getResolvedAllowedExts = (presetId: string, customVal: string): string => {
    if (presetId === "custom") {
      return customVal.trim() || "*";
    }
    const preset = FORMAT_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === "all") return "*";
    return preset.exts.join(",");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("폴더 이름을 입력해 주세요.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const allowedExts = getResolvedAllowedExts(newFormatPreset, newCustomExts);

    try {
      const res = await fetch("/api/sheet-music/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          allowedExts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "폴더 추가에 실패했습니다.");
      }

      setNewName("");
      setNewSlug("");
      setNewFormatPreset("all");
      setNewCustomExts("");
      setSuccess(`'${data.name}' 폴더가 성공적으로 추가되었습니다. (허용 형식: ${getFolderHint(data.slug, data.allowedExts)})`);
      setTimeout(() => setSuccess(""), 4000);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/sheet-music/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          allowedExts: editAllowedExts.trim() || "*",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정 실패");
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 폴더를 삭제하시겠습니까? (항목이 없을 때만 삭제 가능)")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/sheet-music/folders/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const startEdit = (f: FolderItem) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditSlug(f.slug);
    setEditAllowedExts(f.allowedExts || "*");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <p className="text-stone-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          관리로 돌아가기
        </Link>

        <h1 className="text-2xl font-bold text-stone-800 mb-2">악보 폴더 관리</h1>
        <p className="text-stone-600 text-sm mb-6">
          악보 폴더를 추가·수정·삭제할 수 있습니다. 각 폴더별로 올릴 수 있는 파일 형식을 자유롭게 설정하거나 제한 없이 업로드할 수 있습니다.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs"
            >
              닫기
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm flex items-center justify-between">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 text-xs"
            >
              닫기
            </button>
          </div>
        )}

        {/* 새 폴더 추가 카드 */}
        <div className="bg-white rounded-xl border border-amber-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 font-medium text-stone-800 mb-3">
            <FolderPlus className="w-5 h-5 text-amber-600" />
            <span>새 폴더 추가</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  폴더 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: MXL 악보실, 찬양곡"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  영문 식별자 (Slug) <span className="text-stone-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  placeholder="예: mxl (미입력 시 자동)"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
              </div>
            </div>

            {/* 허용 파일 형식 선택 */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <span>허용 파일 형식</span>
                <span className="text-stone-400 font-normal">(폴더에 업로드 가능한 파일 종류)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newFormatPreset}
                  onChange={(e) => setNewFormatPreset(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {FORMAT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">직접 확장자 입력 (예: mxl, musicxml, xml)</option>
                </select>

                {newFormatPreset === "custom" ? (
                  <input
                    type="text"
                    placeholder="쉼표 구분 (예: mxl, musicxml, xml)"
                    value={newCustomExts}
                    onChange={(e) => setNewCustomExts(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                ) : (
                  <div className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 flex items-center">
                    {FORMAT_PRESETS.find((p) => p.id === newFormatPreset)?.hint || "모든 파일 형식"}
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                기본값(모든 파일 형식)으로 두시면 형식 제한 없이 어떤 파일이든 업로드할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !newName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    폴더 추가
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 폴더 목록 */}
        <div className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-700" />
              <span className="font-medium text-stone-800">폴더 목록</span>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              총 {folders.length}개
            </span>
          </div>

          <ul className="divide-y divide-stone-100">
            {folders.length === 0 ? (
              <li className="p-6 text-center text-sm text-stone-500">
                등록된 폴더가 없습니다.
              </li>
            ) : (
              folders.map((f) => (
                <li key={f.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors">
                  {editingId === f.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-0.5">이름</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="폴더 이름"
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-0.5">식별자 (Slug)</label>
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            placeholder="슬러그"
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-stone-500 mb-0.5">허용 확장자 (* = 전체)</label>
                          <input
                            type="text"
                            value={editAllowedExts}
                            onChange={(e) => setEditAllowedExts(e.target.value)}
                            placeholder="예: mxl,musicxml,xml 또는 *"
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(f.id)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 border border-stone-200 hover:bg-stone-100 rounded-lg text-sm transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800">{f.name}</span>
                        <span className="text-stone-400 text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                          /{f.slug}
                        </span>
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          {f.itemCount}개 악보
                        </span>
                        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {getFolderHint(f.slug, f.allowedExts)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => startEdit(f)}
                          className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          disabled={f.itemCount > 0}
                          className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title={f.itemCount > 0 ? "악보 항목이 있는 폴더는 삭제할 수 없습니다" : "삭제"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
