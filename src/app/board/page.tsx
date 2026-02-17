import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { BoardList } from "@/components/board/BoardList";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function BoardPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-stone-800">게시판</h1>
          <Link
            href="/board/new"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </Link>
        </div>

        <BoardList />
      </main>
    </div>
  );
}
