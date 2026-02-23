import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { SheetMusicList } from "@/components/sheet-music/SheetMusicList";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";

function ListFallback() {
  return <div className="text-center py-12 text-stone-500">불러오는 중...</div>;
}

export default async function SheetMusicPage() {
  await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-stone-800">악보 자료실</h1>
          <Link
            href="/sheet-music/new"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            악보 등록
          </Link>
        </div>

        <Suspense fallback={<ListFallback />}>
          <SheetMusicList />
        </Suspense>
      </main>
    </div>
  );
}
