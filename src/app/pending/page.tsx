import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { LogoutButton } from "@/components/LogoutButton";
import { IntroForm } from "@/components/pending/IntroForm";
import { prisma } from "@/lib/prisma";

export default async function PendingPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { introMessage: true, name: true },
    })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-4 text-center">
            가입 승인 대기 중
          </h1>
          <p className="text-stone-600 mb-6 text-center">
            {session?.user?.name}님의 가입 신청이 접수되었습니다.
            <br />
            관리자 승인 후 서비스를 이용하실 수 있습니다.
          </p>

          <div className="mb-6 pt-6 border-t border-stone-100">
            <IntroForm initialIntro={user?.introMessage ?? null} initialName={user?.name ?? null} />
          </div>

          <div className="text-center">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
