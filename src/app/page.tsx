import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlertCircle, ChevronRight } from "lucide-react";
import { HeroImage } from "@/components/HeroImage";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import DOMPurify from "isomorphic-dompurify";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.status === "approved") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) redirect("/admin/claim");
  }

  const notices = await prisma.post.findMany({
    where: { isNotice: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { author: { select: { name: true } }, attachments: true }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <HeroImage />

      <main className="max-w-[90rem] mx-auto px-4 py-8">
        {notices.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-6 px-2">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight">공지사항</h2>
            </div>
            <div className={`grid gap-6 ${notices.length === 1 ? 'grid-cols-1 max-w-4xl mx-auto' :
              notices.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
              {notices.map(notice => {
                let htmlContent = notice.content;
                const ordered = [...(notice.attachments ?? [])].sort((a, b) => a.id.localeCompare(b.id));
                ordered.forEach((att, i) => {
                  htmlContent = htmlContent.replace(new RegExp(`src="\\{\\{INLINE_${i}\\}\\}"`, "g"), `src="${att.filepath}"`);
                });
                // 기본 텍스트 개행 처리
                if (!/<(p|img|div|br|span|strong|em|video|iframe)[\s>]/i.test(htmlContent)) {
                  htmlContent = htmlContent.replace(/\n/g, '<br/>');
                }
                const cleanHtml = DOMPurify.sanitize(htmlContent, {
                  ALLOWED_URI_REGEXP: /^(https?:|data:|\/)/,
                  ADD_TAGS: ["iframe", "video", "source"],
                  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "controls", "playsinline", "preload", "src"],
                }).replace(
                  /<video(\s[^>]*)>/gi,
                  (_, attrs) => `<video${attrs} playsinline preload="metadata">`
                );

                return (
                  <div
                    key={notice.id}
                    className="flex flex-col bg-white rounded-2xl shadow-md border border-amber-200/60 hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden h-full max-h-[600px]"
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-2 p-5 border-b border-stone-100 bg-stone-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg text-stone-800 line-clamp-2 leading-snug">{notice.title}</h3>
                        <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-700 outline outline-1 outline-amber-200 rounded-md text-xs font-bold tracking-wide">공지</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
                        <span>{notice.author.name || "관리자"}</span>
                        <span>·</span>
                        <span>{format(new Date(notice.createdAt), "yyyy.MM.dd", { locale: ko })}</span>
                      </div>
                    </div>

                    {/* Content (Scrollable) */}
                    <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                      <div
                        className="prose prose-sm prose-stone max-w-none 
                                   [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-stone-200 [&_img]:max-h-64 [&_img]:mx-auto [&_img]:object-contain 
                                   [&_iframe]:rounded-lg [&_iframe]:w-full [&_iframe]:aspect-video 
                                   [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:bg-stone-900"
                        dangerouslySetInnerHTML={{ __html: cleanHtml }}
                      />
                    </div>

                    {/* Footer link to full post */}
                    <div className="p-4 border-t border-stone-100 bg-white shrink-0 mt-auto">
                      <Link
                        href={`/board/${notice.id}`}
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
