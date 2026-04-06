import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Pin, MoreHorizontal, FileMusic, ChevronRight } from "lucide-react";
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
    htmlContent = htmlContent.replace(/\n/g, "<br/>");
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

  const [latestPost, latestSheet] = await Promise.all([
    prisma.post.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.sheetMusic.findFirst({
      orderBy: { createdAt: "desc" },
      include: { folder: { select: { id: true, name: true } } },
    }),
  ]);

  const showSheetMusicColumn =
    !!latestSheet && (!latestPost || latestSheet.createdAt > latestPost.createdAt);

  // 고정 게시글 가져오기 (최대 2개)
  const fixedPosts = await prisma.post.findMany({
    where: { isFixed: true },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { author: { select: { name: true } }, attachments: true },
  });

  // 공지사항 로드
  const noticePosts = await prisma.post.findMany({
    where: {
      isNotice: true,
      id: { notIn: fixedPosts.map((p) => p.id) },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { author: { select: { name: true } }, attachments: true },
  });

  let mainPosts = [...noticePosts];

  // 공지사항이 부족하면 최신 게시글로 채움
  if (mainPosts.length < 2) {
    const latestPosts = await prisma.post.findMany({
      where: {
        isNotice: false,
        id: { notIn: fixedPosts.map((p) => p.id) },
      },
      orderBy: { createdAt: "desc" },
      take: 2 - mainPosts.length,
      include: { author: { select: { name: true } }, attachments: true },
    });
    mainPosts = [...mainPosts, ...latestPosts];
  }

  const hasAnyPosts = fixedPosts.length > 0 || mainPosts.length > 0;

  const mainPostsForGrid =
    showSheetMusicColumn && fixedPosts.length > 0 && mainPosts.length === 2
      ? [mainPosts[0]]
      : mainPosts;

  const useThreeColumns =
    (fixedPosts.length > 0 && mainPosts.length === 2) ||
    (fixedPosts.length > 0 && mainPosts.length === 1 && showSheetMusicColumn) ||
    (fixedPosts.length === 0 && mainPosts.length === 2 && showSheetMusicColumn);

  const useTwoColumns =
    (fixedPosts.length > 0 && mainPosts.length === 1 && !showSheetMusicColumn) ||
    (fixedPosts.length === 0 && mainPosts.length === 2 && !showSheetMusicColumn);

  const sheetHref = latestSheet?.folderId
    ? `/sheet-music?folderId=${latestSheet.folderId}`
    : "/sheet-music";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <HeroImage />

      <main className="max-w-[90rem] mx-auto px-4 py-8">
        {hasAnyPosts && (
          <div className="w-full">
            <div
              className={`grid gap-6 grid-cols-1 ${useThreeColumns ? "lg:grid-cols-3" : useTwoColumns ? "lg:grid-cols-2" : ""}`}
            >
              {/* Left Column: Fixed Posts (split height) */}
              {fixedPosts.length > 0 && (
                <div className="flex flex-col gap-6 lg:h-[400px]">
                  {fixedPosts.map((post) => {
                    const cleanHtml = getCleanHtml(post.content, post.attachments);
                    return (
                      <div
                        key={post.id}
                        className="flex flex-col flex-1 min-h-[150px] sm:min-h-0 bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden relative"
                      >
                        <div className="flex flex-col gap-1 p-3 sm:p-5 pb-1 sm:pb-4 border-b border-stone-100 bg-stone-50/50">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-base text-black line-clamp-1 leading-snug pr-6">
                              {post.title}
                            </h3>
                            <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 outline outline-1 outline-blue-200 rounded-md text-xs font-bold tracking-wide">
                              <Pin className="w-3 h-3" /> 고정
                            </span>
                          </div>
                        </div>
                        <div className="p-3 pt-1 sm:p-4 sm:pt-4 overflow-hidden flex-1 relative group">
                          <div
                            className="prose prose-sm text-black [&_*]:text-black max-w-none [&>*:first-child]:mt-0
                                       [&_img]:hidden [&_iframe]:hidden [&_video]:hidden"
                          >
                            <div
                              className="line-clamp-3 text-black"
                              dangerouslySetInnerHTML={{ __html: cleanHtml }}
                            />
                          </div>

                          <Link
                            href={`/board/${post.id}`}
                            className="absolute bottom-3 right-3 p-1.5 bg-white/80 backdrop-blur-sm hover:bg-amber-100 text-stone-400 hover:text-amber-700 rounded-full transition-all shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label="자세히 보기"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Main Posts (Notice / Latest) */}
              {mainPostsForGrid.map((post) => {
                const cleanHtml = getCleanHtml(post.content, post.attachments);
                return (
                  <div
                    key={post.id}
                    className="flex flex-col bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden h-[400px] relative group"
                  >
                    <div className="flex flex-col gap-1 p-3 pb-1.5 sm:p-5 sm:pb-5 border-b border-stone-100 bg-stone-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg text-black line-clamp-2 leading-snug pr-8">{post.title}</h3>
                        {post.isNotice ? (
                          <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-700 outline outline-1 outline-amber-200 rounded-md text-xs font-bold tracking-wide">
                            공지
                          </span>
                        ) : (
                          <span className="shrink-0 px-2.5 py-1 bg-stone-100 text-stone-600 outline outline-1 outline-stone-200 rounded-md text-xs font-bold tracking-wide">
                            최신
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 pt-1.5 sm:p-5 sm:pt-5 overflow-y-auto flex-1 custom-scrollbar pb-16">
                      <div
                        className="prose prose-sm text-black [&_*]:text-black max-w-none [&>*:first-child]:mt-0
                                   [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-stone-200 [&_img]:max-h-64 [&_img]:mx-auto [&_img]:object-contain 
                                   [&_iframe]:rounded-lg [&_iframe]:w-full [&_iframe]:aspect-video 
                                   [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:bg-stone-900"
                        dangerouslySetInnerHTML={{ __html: cleanHtml }}
                      />
                    </div>

                    <div className="absolute bottom-4 right-4 z-10">
                      <Link
                        href={`/board/${post.id}`}
                        className="flex items-center justify-center p-2 bg-white/90 backdrop-blur-sm hover:bg-amber-100 text-stone-400 hover:text-amber-700 shadow-md border border-stone-200 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="자세히 보기"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Right column: 악보 자료실 (게시판 최신보다 더 최신일 때) */}
              {showSheetMusicColumn && latestSheet && (
                <Link
                  href={sheetHref}
                  className="flex flex-col bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-400 transition-all overflow-hidden h-[400px] relative group text-left"
                >
                  <div className="flex flex-col gap-1 p-3 pb-1.5 sm:p-5 sm:pb-5 border-b border-stone-100 bg-amber-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-lg text-black line-clamp-2 leading-snug pr-8">
                        {latestSheet.title}
                      </h3>
                      <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-800 outline outline-1 outline-amber-200 rounded-md text-xs font-bold tracking-wide">
                        악보 자료실
                      </span>
                    </div>
                    {latestSheet.folder && (
                      <p className="text-sm text-stone-600">{latestSheet.folder.name}</p>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-3 rounded-xl bg-amber-100 text-amber-700">
                        <FileMusic className="w-10 h-10" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-stone-600 line-clamp-4">
                          {latestSheet.description?.trim()
                            ? latestSheet.description
                            : "새로 등록된 악보입니다. 악보 자료실에서 확인하세요."}
                        </p>
                        {latestSheet.composer && (
                          <p className="text-sm text-stone-500 mt-2">작곡: {latestSheet.composer}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-stone-100">
                      <time className="text-xs text-stone-500" dateTime={latestSheet.createdAt.toISOString()}>
                        {format(latestSheet.createdAt, "PPp", { locale: ko })}
                      </time>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 group-hover:gap-2 transition-all">
                        악보 자료실로 이동
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
