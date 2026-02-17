import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SheetMusicView } from "@/components/sheet-music/SheetMusicView";

export default async function SheetMusicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const sheetMusic = await prisma.sheetMusic.findUnique({
    where: { id },
    include: { videos: true },
  });

  if (!sheetMusic) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <SheetMusicView sheetMusic={sheetMusic} />
      </main>
    </div>
  );
}
