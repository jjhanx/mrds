"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileMusic, Music2 } from "lucide-react";

interface SheetMusicItem {
  id: string;
  title: string;
  description: string | null;
  composer: string | null;
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
  const [items, setItems] = useState<SheetMusicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sheet-music")
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-stone-500">불러오는 중...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
        <Music2 className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-stone-600 mb-2">아직 등록된 악보가 없습니다.</p>
        <Link
          href="/sheet-music/new"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          첫 악보를 등록해보세요 →
        </Link>
      </div>
    );
  }

  return (
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
  );
}
