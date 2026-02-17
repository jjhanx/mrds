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
        <h1 className="text-2xl font-bold text-stone-800 mb-6">회원 관리</h1>
        <AdminPanel />
      </main>
    </div>
  );
}
