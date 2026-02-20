import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessageSquare, FileMusic, MessageCircle } from "lucide-react";
import Image from "next/image";

// 첫 화면 히어로 이미지 (public/hero.jpg - 1376x752)
const HERO_IMAGE = process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.jpg";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.status === "approved") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) redirect("/admin/claim");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      {/* 히어로 섹션 - hero.jpg (1376×752) */}
      <section className="relative h-[280px] sm:h-[360px] md:h-[450px] w-full overflow-hidden bg-stone-900">
        <Image
          src={HERO_IMAGE}
          alt="미래도시 함께 부르는 하모니"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-lg tracking-tight">
            미래도시
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mt-2 opacity-95 drop-shadow-md">
            함께 부르는 하모니
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-stone-800 mb-2">
            환영합니다, {session?.user?.name || "회원"}님!
          </h1>
          <p className="text-stone-600 text-lg">
            미래도시 합창단 회원 전용 공간에 오신 것을 환영합니다.
          </p>
        </div>

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
