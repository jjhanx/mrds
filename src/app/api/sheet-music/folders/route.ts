import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultFolders } from "@/lib/sheet-music-folders";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaultFolders();

    const folders = await prisma.sheetMusicFolder.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(
      folders.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        sortOrder: f.sortOrder,
        itemCount: f._count.items,
      }))
    );
  } catch (error) {
    console.error("Sheet music folders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureDefaultFolders();

    const all = await prisma.sheetMusicFolder.findMany({ orderBy: { sortOrder: "desc" }, take: 1 });
    const maxOrder = all[0]?.sortOrder ?? -1;
    const baseSlug = `folder-${Date.now()}`;
    const slug = baseSlug;

    const folder = await prisma.sheetMusicFolder.create({
      data: {
        name: "새 폴더",
        slug,
        sortOrder: maxOrder + 1,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Sheet music folder create error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
