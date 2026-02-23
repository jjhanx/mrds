"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  itemCount: number;
}

export default function AdminSheetMusicFoldersPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim() || !newSlug.trim()) {
      setError("이름과 slug를 입력하세요.");
      return;
    }
    try {
      const res = await fetch("/api/sheet-music/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          sortOrder: folders.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "추가 실패");
      setAdding(false);
      setNewName("");
      setNewSlug("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    }
  };

  const handleUpdate = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/sheet-music/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim().toLowerCase().replace(/\s+/g, "-"),
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
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          관리로 돌아가기
        </Link>

        <h1 className="text-2xl font-bold text-stone-800 mb-2">악보 폴더 관리</h1>
        <p className="text-stone-600 text-sm mb-6">
          폴더를 추가·수정·삭제할 수 있습니다. 항목이 있는 폴더는 삭제할 수 없습니다.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between">
            <span className="font-medium text-stone-700 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              폴더 목록
            </span>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            )}
          </div>

          <ul className="divide-y divide-stone-100">
            {adding && (
              <li className="p-4 bg-amber-50/50">
                <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">이름</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-sm w-32"
                      placeholder="예: 클래식"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">slug</label>
                    <input
                      type="text"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-sm w-32"
                      placeholder="예: classic"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdding(false); setNewName(""); setNewSlug(""); }}
                    className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  >
                    취소
                  </button>
                </form>
              </li>
            )}
            {folders.map((f) => (
              <li key={f.id} className="p-4 flex items-center justify-between gap-4">
                {editingId === f.id ? (
                  <div className="flex flex-wrap gap-3 items-center flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-sm w-28"
                    />
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="px-3 py-2 border border-stone-200 rounded-lg text-sm w-28"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(f.id)}
                      className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-medium text-stone-800">{f.name}</span>
                      <span className="text-stone-400 text-sm ml-2">/{f.slug}</span>
                      <span className="text-stone-400 text-sm ml-2">({f.itemCount}개)</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(f)}
                        className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id)}
                        disabled={f.itemCount > 0}
                        className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:pointer-events-none"
                        title={f.itemCount > 0 ? "항목이 있으면 삭제 불가" : "삭제"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
