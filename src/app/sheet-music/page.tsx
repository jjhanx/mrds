import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { SheetMusicList } from "@/components/sheet-music/SheetMusicList";
import { Suspense } from "react";

function ListFallback() {
  return <div className="text-center py-12 text-stone-500">불러오는 중...</div>;
}

export default async function SheetMusicPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-8">악보 자료실</h1>

        <Suspense fallback={<ListFallback />}>
          <SheetMusicList isAdmin={isAdmin} />
        </Suspense>
      </main>
    </div>
  );
}
