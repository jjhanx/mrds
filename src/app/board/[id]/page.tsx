import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PostView } from "@/components/board/PostView";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, image: true } },
      attachments: true,
    },
  });
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <PostView post={post} currentUserId={session.user.id} />
      </main>
    </div>
  );
}
