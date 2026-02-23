"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileMusic, Music2, Folder } from "lucide-react";

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
  description: string | null;
  composer: string | null;
  folderId: string | null;
  folder?: { id: string; name: string; slug: string } | null;
  videos: { id: string; part: string; videoUrl: string }[];
}

const PART_LABELS: Record<string, string> = {
  soprano: "소프라노",
  alto: "알토",
  tenor: "테너",
  bass: "베이스",
  full: "전체",
};

export function SheetMusicList() {
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId") ?? "";

  const [folders, setFolders] = useState<SheetMusicFolder[]>([]);
  const [items, setItems] = useState<SheetMusicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheet-music/folders")
      .then((res) => res.json())
      .then((data) => {
        setFolders(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = folderIdParam
      ? `/api/sheet-music?folderId=${encodeURIComponent(folderIdParam)}`
      : "/api/sheet-music";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [folderIdParam]);

  if (loading && items.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">불러오는 중...</div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 폴더 사이드바 */}
      <aside className="w-full md:w-56 flex-shrink-0">
        <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2 font-medium text-stone-700">
            <Folder className="w-4 h-4" />
            폴더
          </div>
          <nav className="p-2">
            <Link
              href="/sheet-music"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !folderIdParam
                  ? "bg-amber-100 text-amber-800"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              전체
            </Link>
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/sheet-music?folderId=${f.id}`}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            ))}
          </nav>
        </div>
      </aside>

      {/* 목록 */}
      <div className="flex-1 min-w-0">
        {items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
            <Music2 className="w-12 h-12 text-amber-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-2">
              {folderIdParam ? "이 폴더에 등록된 악보가 없습니다." : "아직 등록된 악보가 없습니다."}
            </p>
            <Link
              href="/sheet-music/new"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              첫 악보를 등록해보세요 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-amber-100 hover:border-amber-200 transition-all"
              >
                <FileMusic className="w-8 h-8 text-amber-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sheet-music/${item.id}`}
                    className="font-semibold text-stone-800 hover:text-amber-700"
                  >
                    {item.title}
                  </Link>
                  {item.composer && (
                    <p className="text-sm text-stone-500 mt-0.5">{item.composer}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.videos.map((v) => (
                    <a
                      key={v.id}
                      href={v.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors"
                    >
                      {PART_LABELS[v.part] || v.part}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
