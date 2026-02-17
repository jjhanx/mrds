import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminClaimButton } from "@/components/admin/AdminClaimButton";

export default async function AdminClaimPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  if (adminCount > 0) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-amber-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">
          첫 관리자 등록
        </h1>
        <p className="text-stone-600 mb-6">
          아직 관리자가 없습니다. 현재 로그인한 계정으로 관리자를 등록할 수
          있습니다.
        </p>
        <AdminClaimButton />
      </div>
    </div>
  );
}
