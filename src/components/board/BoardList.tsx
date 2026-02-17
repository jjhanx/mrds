"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText, Paperclip } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { name: string | null };
  attachments: { id: string }[];
}

export function BoardList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-stone-500">불러오는 중...</div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
        <FileText className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-stone-600 mb-2">아직 게시글이 없습니다.</p>
        <Link
          href="/board/new"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          첫 글을 작성해보세요 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/board/${post.id}`}
          className="block p-4 bg-white rounded-xl border border-amber-100 hover:border-amber-200 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-stone-800 truncate">
                {post.title}
              </h2>
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                {post.content.replace(/<[^>]*>/g, "").slice(0, 100)}
                {post.content.length > 100 ? "..." : ""}
              </p>
              <div className="flex items-center gap-3 mt-2 text-sm text-stone-400">
                <span>{post.author.name || "익명"}</span>
                <span>
                  {format(new Date(post.createdAt), "PPp", { locale: ko })}
                </span>
                {post.attachments?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {post.attachments.length}개 첨부
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
