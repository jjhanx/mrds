"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText, Paperclip, MessageSquare, Search } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { CommentList } from "@/components/comments/CommentList";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isNotice?: boolean;
  isFixed?: boolean;
  author: { name: string | null };
  attachments: { id: string, filepath: string }[];
  _count?: { comments: number };
}

interface BoardListProps {
  userRole?: string;
  currentUserId?: string;
}

export function BoardList({ userRole, currentUserId }: BoardListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());

  const fetchPosts = (query: string = "") => {
    setLoading(true);
    fetch(`/api/posts${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(searchQuery);
  };

  const handleToggleNotice = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    if (!confirm("이 글의 공지 상태를 변경하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${postId}/notice`, { method: "PATCH" });
    if (res.ok) {
      fetchPosts(searchQuery);
    } else {
      alert("공지 설정에 실패했습니다.");
    }
  };

  const handleToggleFixed = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    if (!confirm("이 글의 고정 상태를 변경하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${postId}/fixed`, { method: "PATCH" });
    if (res.ok) {
      fetchPosts(searchQuery);
    } else {
      alert("고정 설정에 실패했습니다.");
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPostIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const getCleanHtml = (html: string, attachments: any[]) => {
    let htmlContent = html;
    const ordered = [...(attachments ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    ordered.forEach((att, i) => {
      htmlContent = htmlContent.replace(new RegExp(`src="\\{\\{INLINE_${i}\\}\\}"`, "g"), `src="${att.filepath}"`);
    });
    return DOMPurify.sanitize(htmlContent, {
      ALLOWED_URI_REGEXP: /^(https?:|data:|\/)/,
      ADD_TAGS: ["iframe", "video", "source"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "controls", "playsinline", "preload", "src"],
    }).replace(
      /<video(\s[^>]*)>/gi,
      (_, attrs) => `<video${attrs} playsinline preload="metadata">`
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목, 내용, '공지', '고정' 검색..."
          className="w-full pl-11 pr-4 py-3 rounded-full border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
      </form>

      {loading ? (
        <div className="text-center py-12 text-stone-500">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-amber-100 shadow-sm">
          <FileText className="w-12 h-12 text-amber-300 mx-auto mb-4" />
          <p className="text-stone-600 mb-2">아직 게시글이 없습니다. (또는 검색 결과가 없습니다)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isExpanded = expandedPostIds.has(post.id);
            return (
              <div
                key={post.id}
                className={`flex flex-col bg-white rounded-2xl border ${post.isNotice ? 'border-amber-400 shadow-sm bg-amber-50/10' : 'border-amber-100 shadow-sm'} overflow-hidden transition-all`}
              >
                <Link
                  href={`/board/${post.id}`}
                  className="block p-4 sm:p-5 hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 sm:mb-3">
                        {post.isNotice && (
                          <span className="shrink-0 px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs font-semibold bg-red-100 text-red-600">
                            공지
                          </span>
                        )}
                        {post.isFixed && (
                          <span className="shrink-0 px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-600">
                            고정
                          </span>
                        )}
                        <h2 className="font-bold text-base sm:text-lg text-stone-800 line-clamp-2 sm:line-clamp-1">
                          {post.title}
                        </h2>
                      </div>

                      <div className="prose prose-sm prose-stone max-w-none [&>*:first-child]:mt-0
                                    [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-stone-200 [&_img]:max-h-56 sm:[&_img]:max-h-64 [&_img]:object-contain 
                                    [&_iframe]:rounded-lg [&_iframe]:w-full [&_iframe]:max-w-xl [&_iframe]:aspect-video 
                                    [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:bg-stone-900 line-clamp-[6] sm:line-clamp-[10]"
                        dangerouslySetInnerHTML={{ __html: getCleanHtml(post.content, post.attachments) }}
                      />

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 sm:gap-y-0 mt-4 text-[13px] sm:text-sm text-stone-500 pt-3 border-t border-stone-50">
                        <span>{post.author.name || "익명"}</span>
                        <span className="hidden sm:inline">·</span>
                        <span>
                          {format(new Date(post.createdAt), "PPp", { locale: ko })}
                        </span>
                        {post.attachments?.length > 0 && (
                          <>
                            <span className="hidden sm:inline">·</span>
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3.5 h-3.5" />
                              {post.attachments.length}개
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {userRole === "admin" && (
                      <div className="shrink-0 flex flex-row sm:flex-col gap-2 mt-3 sm:mt-0">
                        <button
                          onClick={(e) => handleToggleNotice(e, post.id)}
                          className={`flex-1 sm:flex-none text-xs px-2 py-1.5 rounded border transition-colors ${post.isNotice
                            ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                            }`}
                        >
                          {post.isNotice ? "공지 해제" : "공지 등록"}
                        </button>
                        <button
                          onClick={(e) => handleToggleFixed(e, post.id)}
                          className={`text-xs px-2 py-1.5 rounded border transition-colors ${post.isFixed
                            ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                            }`}
                        >
                          {post.isFixed ? "고정 해제" : "고정 등록"}
                        </button>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="px-5 pb-4">
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    댓글 {post._count?.comments || 0}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      <CommentList
                        postId={post.id}
                        currentUserId={currentUserId}
                        isAdmin={userRole === "admin"}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
