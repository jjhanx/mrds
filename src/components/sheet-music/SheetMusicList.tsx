"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isFileAllowed, isFileSizeAllowed, getFolderHint, getMaxFileSizeLabel } from "@/constants/sheet-music";
import {
  FileMusic,
  Folder,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Printer,
  Download,
  Share2,
  X,
} from "lucide-react";

interface SheetMusicFolder {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  itemCount: number;
}

interface SheetMusicItem {
  id: string;
  title: string;
  filepath: string;
  folderId: string | null;
  createdAt?: string;
  videos: { id: string; part: string; videoUrl: string }[];
  nwcFiles: { id: string; filepath: string }[];
}

interface SheetMusicListProps {
  isAdmin?: boolean;
}

export function SheetMusicList({ isAdmin = false }: SheetMusicListProps) {
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId") ?? "";

  const [folders, setFolders] = useState<SheetMusicFolder[]>([]);
  const [items, setItems] = useState<SheetMusicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [attachModal, setAttachModal] = useState<{ id: string; title: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string; title: string } | null>(null);
  const SORT_KEY = "sheet-music-sort";
  const validSort = (v: string): v is "name-asc" | "name-desc" | "date-asc" | "date-desc" =>
    ["name-asc", "name-desc", "date-asc", "date-desc"].includes(v);
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      if (saved && validSort(saved)) {
        const [by, order] = saved.split("-");
        setSortBy(by as "name" | "date");
        setSortOrder(order as "asc" | "desc");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadFolders = useCallback(() => {
    fetch("/api/sheet-music/folders", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setFolders(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const loadItems = useCallback(() => {
    setLoading(true);
    const url = folderIdParam
      ? `/api/sheet-music?folderId=${encodeURIComponent(folderIdParam)}`
      : "/api/sheet-music";
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [folderIdParam]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === folderIdParam),
    [folders, folderIdParam]
  );
  const uploadHint = currentFolder
    ? `${getFolderHint(currentFolder.slug)} (파일당 최대 ${getMaxFileSizeLabel(currentFolder.slug)})`
    : "PDF, 이미지";

  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const mul = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") {
        return mul * (a.title.localeCompare(b.title, "ko"));
      }
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return mul * (da - db);
    });
    return arr;
  }, [items, sortBy, sortOrder]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!folderIdParam || uploading) return;

    const slug = currentFolder?.slug ?? "";
    const allValid = Array.from(e.dataTransfer.files).filter(
      (f) => f.size > 0 && isFileAllowed({ name: f.name, type: f.type }, slug)
    );
    const oversized = allValid.filter((f) => !isFileSizeAllowed(f.size, slug));
    const files = allValid.filter((f) => isFileSizeAllowed(f.size, slug));

    if (oversized.length > 0) {
      const maxLabel = getMaxFileSizeLabel(slug);
      alert(`이 폴더는 파일당 최대 ${maxLabel}까지 허용됩니다. (초과: ${oversized.map((f) => f.name).join(", ")})`);
    }
    if (files.length === 0) {
      if (oversized.length === 0) {
        const hint = getFolderHint(slug);
        alert(`이 폴더에는 ${hint}만 업로드할 수 있습니다.`);
      }
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    const CHUNK_SIZE = 5;

    try {
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        setUploadProgress({ done: i, total: files.length });
        const formData = new FormData();
        formData.append("folderId", folderIdParam);
        chunk.forEach((f) => formData.append("files", f));

        const res = await fetch("/api/sheet-music/bulk", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const text = await res.text();
        let data: { error?: string };
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          const msg = res.status === 413 ? "파일 용량이 너무 큽니다. 개수가 많으면 자동으로 나눠 업로드됩니다." : `업로드 실패 (${res.status})`;
          throw new Error(res.ok ? "응답 형식 오류" : msg);
        }

        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "업로드 실패");
        }
      }
      setUploadProgress({ done: files.length, total: files.length });
      loadItems();
      loadFolders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpdateFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    try {
      const res = await fetch(`/api/sheet-music/folders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFolderName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정 실패");
      setEditingFolderId(null);
      loadFolders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const f = folders.find((x) => x.id === id);
    if (!f || !confirm(`"${f.name}" 폴더를 삭제하시겠습니까? (비어 있을 때만)`)) return;
    try {
      const res = await fetch(`/api/sheet-music/folders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      loadFolders();
      if (folderIdParam === id) window.location.href = "/sheet-music";
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0 || !confirm(`${selected.size}개를 삭제하시겠습니까?`)) return;
    for (const id of selected) {
      await fetch(`/api/sheet-music/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    }
    setSelected(new Set());
    loadItems();
    loadFolders();
  };

  const handleRename = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/sheet-music/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("수정 실패");
      setRenameModal(null);
      loadItems();
    } catch (err) {
      alert("이름 변경 실패");
    }
  };

  const handlePrint = () => {
    selected.forEach((id) => {
      const item = items.find((x) => x.id === id);
      if (item?.filepath && !item.filepath.startsWith("http")) {
        window.open(item.filepath, "_blank", "width=800,height=600")?.print();
      } else if (item?.filepath) {
        window.open(item.filepath);
      }
    });
  };

  const handleDownload = () => {
    selected.forEach((id) => {
      const item = items.find((x) => x.id === id);
      if (item?.filepath) {
        const a = document.createElement("a");
        a.href = item.filepath.startsWith("http") ? item.filepath : item.filepath;
        a.download = item.title + (item.filepath.match(/\.\w+$/)?.[0] || "");
        a.target = "_blank";
        a.click();
      }
    });
  };

  const handleShare = () => {
    const url =
      selected.size === 1
        ? window.location.origin + "/sheet-music/" + [...selected][0]
        : folderIdParam
          ? `${window.location.origin}/sheet-music?folderId=${folderIdParam}`
          : window.location.origin + "/sheet-music";
    if (navigator.share && selected.size === 1) {
      navigator.share({
        title: items.find((i) => i.id === [...selected][0])?.title || "악보",
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다.");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  if (loading && items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">불러오는 중...</div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 폴더 사이드바 */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2 font-medium text-stone-700">
            <Folder className="w-4 h-4" />
            폴더
          </div>
          <nav className="p-2 max-h-[60vh] overflow-y-auto">
            <Link
              href="/sheet-music"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !folderIdParam ? "bg-amber-100 text-amber-800" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              전체
            </Link>
            {folders.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-1 rounded-lg hover:bg-stone-50"
              >
                {editingFolderId === f.id ? (
                  <div className="flex-1 min-w-0 flex flex-col gap-2 p-2">
                    <input
                      type="text"
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateFolder(f.id);
                        if (e.key === "Escape") setEditingFolderId(null);
                      }}
                      className="w-full min-w-0 px-3 py-2 text-sm border border-stone-200 rounded-lg"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateFolder(f.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFolderId(null)}
                        className="flex-1 px-3 py-1.5 text-sm border rounded-lg"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/sheet-music?folderId=${f.id}`}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        folderIdParam === f.id
                          ? "bg-amber-100 text-amber-800"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {f.name}
                        <span className="text-stone-400 tabular-nums">{f.itemCount}</span>
                      </span>
                    </Link>
                    {isAdmin && (
                      <div className="flex opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingFolderId(f.id);
                            setEditFolderName(f.name);
                          }}
                          className="p-1 text-stone-400 hover:text-amber-600"
                          title="이름 변경"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(f.id)}
                          disabled={f.itemCount > 0}
                          className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-40"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* 목록 + 드롭존 */}
      <div className="flex-1 min-w-0">
        {folderIdParam && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mb-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging
                ? "border-amber-500 bg-amber-50"
                : "border-stone-200 bg-stone-50 hover:border-amber-300"
            } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-stone-600 font-medium">
              {uploading
                ? uploadProgress
                  ? `${uploadProgress.done}/${uploadProgress.total} 업로드 중...`
                  : "업로드 중..."
                : "여기에 파일을 끌어다 놓으세요"}
            </p>
            <p className="text-sm text-stone-400 mt-1">{uploadHint} 여러 개 업로드 가능</p>
          </div>
        )}

        {selected.size > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-amber-800">{selected.size}개 선택</span>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-amber-100"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-amber-100"
            >
              <Download className="w-4 h-4" />
              다운로드
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-amber-100"
            >
              <Share2 className="w-4 h-4" />
              공유
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto px-2 py-1 text-sm text-stone-500"
            >
              선택 해제
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
            <FileMusic className="w-12 h-12 text-amber-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-2">
              {folderIdParam
                ? "이 폴더에 악보가 없습니다. 위에 파일을 끌어다 놓으세요."
                : "폴더를 선택하거나 악보를 업로드하세요."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 flex-wrap">
              <input
                type="checkbox"
                checked={selected.size === items.length && items.length > 0}
                onChange={selectAll}
                className="rounded"
              />
              <span className="text-sm text-stone-500">전체 선택</span>
              <span className="text-stone-300">|</span>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-stone-500">정렬:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!validSort(val)) return;
                    const [by, order] = val.split("-");
                    setSortBy(by as "name" | "date");
                    setSortOrder(order as "asc" | "desc");
                    try {
                      localStorage.setItem(SORT_KEY, val);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="text-stone-600 border border-stone-200 rounded-lg px-2 py-1 bg-white"
                >
                  <option value="name-asc">이름순 (가나다↑)</option>
                  <option value="name-desc">이름순 (가나다↓)</option>
                  <option value="date-desc">업로드일순 (최신↑)</option>
                  <option value="date-asc">업로드일순 (오래된↑)</option>
                </select>
              </div>
            </div>
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-amber-100 hover:border-amber-200 transition-all"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="rounded flex-shrink-0"
                />
                <FileMusic className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sheet-music/${item.id}`}
                    className="font-semibold text-stone-800 hover:text-amber-700"
                  >
                    {item.title}
                  </Link>
                </div>
                <div className="flex items-center gap-1">
                  {(item.nwcFiles?.length ?? 0) > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded">
                      NWC
                    </span>
                  )}
                  {(item.videos?.length ?? 0) > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      동영상
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachModal({ id: item.id, title: item.title })}
                    className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    title="NWC/동영상 첨부"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameModal({ id: item.id, title: item.title })}
                    className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    title="이름 변경"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 첨부 모달 */}
      {attachModal && (
        <AttachModal
          id={attachModal.id}
          title={attachModal.title}
          onClose={() => setAttachModal(null)}
          onSuccess={() => {
            setAttachModal(null);
            loadItems();
          }}
        />
      )}

      {/* 이름 변경 모달 */}
      {renameModal && (
        <RenameModal
          id={renameModal.id}
          title={renameModal.title}
          onClose={() => setRenameModal(null)}
          onSave={(title) => {
            handleRename(renameModal.id, title);
          }}
        />
      )}
    </div>
  );
}

function AttachModal({
  id,
  title,
  onClose,
  onSuccess,
}: {
  id: string;
  title: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nwcFile, setNwcFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nwcFile && !videoUrl.trim()) return;
    setSaving(true);
    const formData = new FormData();
    if (nwcFile) formData.append("nwcFile", nwcFile);
    if (videoUrl.trim()) formData.append("videoUrl", videoUrl.trim());

    try {
      const res = await fetch(`/api/sheet-music/${id}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("첨부 실패");
      onSuccess();
    } catch (err) {
      alert("첨부 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-stone-800">첨부 — {title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">NWC 파일</label>
            <input
              type="file"
              accept=".nwc"
              onChange={(e) => setNwcFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm border border-stone-200 rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">연습 동영상 URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              취소
            </button>
            <button
              type="submit"
              disabled={(!nwcFile && !videoUrl.trim()) || saving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "첨부"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameModal({
  id,
  title,
  onClose,
  onSave,
}: {
  id: string;
  title: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [value, setValue] = useState(title);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-stone-800">이름 변경</h3>
          <button type="button" onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg mb-4"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(value.trim())}
            disabled={!value.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
