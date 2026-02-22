import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PostForm } from "@/components/board/PostForm";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!post) notFound();
  if (post.authorId !== session.user.id) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-stone-800 mb-6">게시글 수정</h2>
        <PostForm
          post={{ id: post.id, title: post.title, content: post.content }}
          existingAttachments={post.attachments}
          isEdit
        />
      </main>
    </div>
  );
}
