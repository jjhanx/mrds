import { Navbar } from "@/components/Navbar";
import { PostForm } from "@/components/board/PostForm";

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">글쓰기</h1>
        <PostForm />
      </main>
    </div>
  );
}
