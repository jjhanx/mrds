import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlertCircle, ChevronRight, Pin } from "lucide-react";
import { HeroImage } from "@/components/HeroImage";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import DOMPurify from "isomorphic-dompurify";

function getCleanHtml(html: string, attachments: any[]) {
  let htmlContent = html;
  const ordered = [...(attachments ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  ordered.forEach((att, i) => {
    htmlContent = htmlContent.replace(new RegExp(`src="\\{\\{INLINE_${i}\\}\\}"`, "g"), `src="${att.filepath}"`);
  });
  if (!/<(p|img|div|br|span|strong|em|video|iframe)[\s>]/i.test(htmlContent)) {
    htmlContent = htmlContent.replace(/\n/g, '<br/>');
  }
  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_URI_REGEXP: /^(https?:|data:|\/)/,
    ADD_TAGS: ["iframe", "video", "source"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "controls", "playsinline", "preload", "src"],
  }).replace(
    /<video(\s[^>]*)>/gi,
    (_, attrs) => `<video${attrs} playsinline preload="metadata">`
  );
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.status === "approved") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) redirect("/admin/claim");
  }

  // 고정 게시글 가져오기 (최대 2개)
  const fixedPosts = await prisma.post.findMany({
    where: { isFixed: true },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { author: { select: { name: true } }, attachments: true }
  });

  // 공지사항 로드
  const noticePosts = await prisma.post.findMany({
    where: {
      isNotice: true,
      id: { notIn: fixedPosts.map(p => p.id) }
    },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { author: { select: { name: true } }, attachments: true }
  });

  let mainPosts = [...noticePosts];

  // 공지사항이 부족하면 최신 게시글로 채움
  if (mainPosts.length < 2) {
    const latestPosts = await prisma.post.findMany({
      where: {
        isNotice: false,
        id: { notIn: fixedPosts.map(p => p.id) }
      },
      orderBy: { createdAt: "desc" },
      take: 2 - mainPosts.length,
      include: { author: { select: { name: true } }, attachments: true }
    });
    mainPosts = [...mainPosts, ...latestPosts];
  }

  const hasAnyPosts = fixedPosts.length > 0 || mainPosts.length > 0;

  // 전체를 표시하기 위한 조건 계산
  const useThreeColumns = fixedPosts.length > 0 && mainPosts.length === 2;
  const useTwoColumns = (fixedPosts.length > 0 && mainPosts.length === 1) || (fixedPosts.length === 0 && mainPosts.length === 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <HeroImage />

      <main className="max-w-[90rem] mx-auto px-4 py-8">
        {hasAnyPosts && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <h2 className="text-2xl font-bold text-stone-800 tracking-tight">게시판</h2>
              </div>
              <Link href="/board" className="text-sm font-medium text-stone-500 hover:text-amber-600 hover:underline flex items-center">
                전체보기 <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            <div className={`grid gap-6 grid-cols-1 ${useThreeColumns ? 'lg:grid-cols-3' : useTwoColumns ? 'lg:grid-cols-2' : ''}`}>

              {/* Left Column: Fixed Posts (split height) */}
              {fixedPosts.length > 0 && (
                <div className="flex flex-col gap-6 lg:h-[600px] h-auto">
                  {fixedPosts.map(post => {
                    const cleanHtml = getCleanHtml(post.content, post.attachments);
                    return (
                      <div
                        key={post.id}
                        className="flex flex-col flex-1 bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden relative"
                      >
                        <div className="flex flex-col gap-2 p-4 border-b border-stone-100 bg-stone-50/50">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-base text-stone-800 line-clamp-1 leading-snug">{post.title}</h3>
                            <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 outline outline-1 outline-blue-200 rounded-md text-xs font-bold tracking-wide">
                              <Pin className="w-3 h-3" /> 고정
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                            <span>{post.author.name || "관리자"}</span>
                            <span>·</span>
                            <span>{format(new Date(post.createdAt), "yyyy.MM.dd", { locale: ko })}</span>
                          </div>
                        </div>
                        <div className="p-4 overflow-hidden flex-1 relative">
                          <div
                            className="prose prose-sm prose-stone max-w-none 
                                       [&_img]:hidden [&_iframe]:hidden [&_video]:hidden"
                          >
                            <div
                              className="line-clamp-3 text-stone-600"
                              dangerouslySetInnerHTML={{ __html: cleanHtml }}
                            />
                          </div>
                        </div>
                        <Link
                          href={`/board/${post.id}`}
                          className="flex items-center justify-center gap-1 w-full py-2 bg-stone-50 hover:bg-amber-50 text-stone-600 hover:text-amber-700 transition-colors text-xs font-semibold border-t border-stone-100 mt-auto"
                        >
                          자세히 보기 <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Main Posts (Notice / Latest) */}
              {mainPosts.map(post => {
                const cleanHtml = getCleanHtml(post.content, post.attachments);
                return (
                  <div
                    key={post.id}
                    className="flex flex-col bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden h-[600px]"
                  >
                    <div className="flex flex-col gap-2 p-5 border-b border-stone-100 bg-stone-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg text-stone-800 line-clamp-2 leading-snug">{post.title}</h3>
                        {post.isNotice ? (
                          <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-700 outline outline-1 outline-amber-200 rounded-md text-xs font-bold tracking-wide">공지</span>
                        ) : (
                          <span className="shrink-0 px-2.5 py-1 bg-stone-100 text-stone-600 outline outline-1 outline-stone-200 rounded-md text-xs font-bold tracking-wide">최신</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
                        <span>{post.author.name || "관리자"}</span>
                        <span>·</span>
                        <span>{format(new Date(post.createdAt), "yyyy.MM.dd", { locale: ko })}</span>
                      </div>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                      <div
                        className="prose prose-sm prose-stone max-w-none 
                                   [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-stone-200 [&_img]:max-h-64 [&_img]:mx-auto [&_img]:object-contain 
                                   [&_iframe]:rounded-lg [&_iframe]:w-full [&_iframe]:aspect-video 
                                   [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:bg-stone-900"
                        dangerouslySetInnerHTML={{ __html: cleanHtml }}
                      />
                    </div>
                    <div className="p-4 border-t border-stone-100 bg-white shrink-0 mt-auto">
                      <Link
                        href={`/board/${post.id}`}
                        className="flex items-center justify-center gap-1 w-full py-2.5 bg-stone-50 hover:bg-amber-50 text-stone-600 hover:text-amber-700 rounded-xl transition-colors text-sm font-semibold border border-stone-200 hover:border-amber-200"
                      >
                        자세히 보기
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
