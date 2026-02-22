"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Paperclip, Pencil } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

// YouTube/Vimeo URL to embed
function isVideoUrl(url: string) {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com")
  );
}

function getEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed.includes("youtu.be/")) {
    const id = trimmed.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  const ytMatch = trimmed.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

// Image URL detection
function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.includes("imgur");
}

// HTML 콘텐츠 여부 (리치 에디터로 작성된 글)
function isHtmlContent(content: string) {
  if (!content?.trim()) return false;
  return /<(p|img|div|br|span|strong|em)[\s>]/i.test(content.trim());
}

interface PostViewProps {
  post: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    authorId: string;
    author: { name: string | null; image: string | null };
    attachments: { id: string; filename: string; filepath: string; fileType: string }[];
  };
  currentUserId: string;
}

export function PostView({ post, currentUserId }: PostViewProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/board");
      router.refresh();
    }
  };

  // Parse content for blocks: text, video embeds, image URLs
  const renderContent = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<br key={i++} />);
        continue;
      }

      // Video URL
      if (isVideoUrl(trimmed)) {
        const embed = getEmbedUrl(trimmed);
        if (embed) {
          elements.push(
            <div key={i++} className="my-4 aspect-video max-w-2xl">
              <iframe
                src={embed}
                className="w-full h-full rounded-lg"
                allowFullScreen
                title="Video"
              />
            </div>
          );
          continue;
        }
      }

      // Image URL
      if (isImageUrl(trimmed) || (trimmed.startsWith("http") && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(trimmed))) {
        elements.push(
          <div key={i++} className="my-4">
            <img
              src={trimmed}
              alt=""
              className="max-w-full rounded-lg border border-stone-200"
              style={{ maxHeight: "400px", objectFit: "contain" }}
            />
          </div>
        );
        continue;
      }

      elements.push(
        <p key={i++} className="mb-2 leading-relaxed">
          {line}
        </p>
      );
    }

    return elements;
  };

  return (
    <article className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        <Link
          href="/board"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-700 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>

        <h1 className="text-2xl font-bold text-stone-800 mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-stone-500 mb-6 pb-6 border-b border-stone-100">
          {post.author.image && (
            <Image
              src={post.author.image}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span>{post.author.name || "익명"}</span>
          <span>·</span>
          <span>{format(new Date(post.createdAt), "PPp", { locale: ko })}</span>
          {post.authorId === currentUserId && (
            <div className="ml-auto flex items-center gap-4">
              <Link
                href={`/board/${post.id}/edit`}
                className="flex items-center gap-1 text-amber-600 hover:text-amber-700"
              >
                <Pencil className="w-4 h-4" />
                수정
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="prose prose-stone max-w-none">
          {isHtmlContent(post.content) ? (
            <div
              className="post-content whitespace-pre-wrap [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-stone-200 [&_img]:max-h-80 [&_img]:object-contain"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  (() => {
                    let c = post.content;
                    // {{INLINE_0}} 등이 남아있는 구 글: image attachments로 치환
                    post.attachments
                      ?.filter((a) => a.fileType.startsWith("image/"))
                      .forEach((att, i) => {
                        c = c.replace(new RegExp(`src="\\{\\{INLINE_${i}\\}\\}"`, "g"), `src="${att.filepath}"`);
                      });
                    return c;
                  })(),
                  { ALLOWED_URI_REGEXP: /^(https?:|data:|\/)/ }
                ),
              }}
            />
          ) : (
            <div className="whitespace-pre-wrap">{renderContent(post.content)}</div>
          )}
        </div>

        {post.attachments?.length > 0 && !isHtmlContent(post.content) && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <h3 className="flex items-center gap-2 font-medium text-stone-700 mb-3">
              <Paperclip className="w-4 h-4" />
              첨부파일
            </h3>
            <ul className="space-y-2">
              {post.attachments.map((att) => {
                const isImage = att.fileType.startsWith("image/");
                const isVideo = att.fileType.startsWith("video/");
                const isPdf = att.fileType === "application/pdf";

                return (
                  <li key={att.id}>
                    {isImage && (
                      <div className="my-2">
                        <img
                          src={att.filepath}
                          alt={att.filename}
                          className="max-w-full rounded-lg border max-h-80 object-contain"
                        />
                      </div>
                    )}
                    {isVideo && (
                      <div className="my-2">
                        <video
                          src={att.filepath}
                          controls
                          className="max-w-full rounded-lg"
                        />
                      </div>
                    )}
                    {!isImage && !isVideo && (
                      <a
                        href={att.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-amber-600 hover:text-amber-700"
                      >
                        {att.filename}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
