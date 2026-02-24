import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessageSquare, FileMusic, MessageCircle, AlertCircle } from "lucide-react";
import { HeroImage } from "@/components/HeroImage";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
    include: { author: { select: { name: true } } }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <HeroImage />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {notices.length > 0 && (
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 px-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-stone-800">공지사항</h2>
            </div>
            <div className="grid gap-3">
              {notices.map(notice => (
                <Link
                  key={notice.id}
                  href={`/board/${notice.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-red-100 hover:shadow-md hover:border-red-200 transition-all gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-semibold">공지</span>
                    <span className="font-medium text-stone-800 truncate">{notice.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-sm text-stone-500">
                    <span>{notice.author.name || "관리자"}</span>
                    <span>{format(new Date(notice.createdAt), "yyyy.MM.dd", { locale: ko })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Link
            href="/board"
            className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl hover:border-amber-200 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-stone-800 group-hover:text-amber-800">
                게시판
              </h2>
              <p className="text-stone-600 text-sm mt-1">
                회원들과 소통하고 글, 이미지, 동영상을 공유해보세요.
              </p>
            </div>
          </Link>

          <Link
            href="/sheet-music"
            className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl hover:border-amber-200 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <FileMusic className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-stone-800 group-hover:text-amber-800">
                악보 자료실
              </h2>
              <p className="text-stone-600 text-sm mt-1">
                악보를 보고 파트별 연습 영상으로 연습해보세요.
              </p>
            </div>
          </Link>

          <Link
            href="/chat"
            className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl hover:border-amber-200 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-stone-800 group-hover:text-amber-800">
                채팅
              </h2>
              <p className="text-stone-600 text-sm mt-1">
                회원들끼리 실시간으로 대화해보세요.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
