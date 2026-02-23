import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">관리</h1>
        <nav className="flex gap-4 mb-8">
          <a
            href="/admin"
            className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 font-medium"
          >
            회원 관리
          </a>
          <a
            href="/admin/sheet-music-folders"
            className="px-4 py-2 rounded-lg border border-stone-200 hover:bg-white font-medium"
          >
            악보 폴더 관리
          </a>
        </nav>
        <h2 className="text-xl font-semibold text-stone-800 mb-4">회원 관리</h2>
        <AdminPanel />
      </main>
    </div>
  );
}
