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

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.json({ error: "관리자만 폴더를 추가할 수 있습니다" }, { status: 403 });
    }

    await ensureDefaultFolders();

    const all = await prisma.sheetMusicFolder.findMany({ orderBy: { sortOrder: "desc" }, take: 1 });
    const maxOrder = all[0]?.sortOrder ?? -1;
    const slug = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg.includes("Unique constraint") ? "폴더 생성 중 중복이 발생했습니다. 다시 시도해 주세요." : `폴더 생성 실패: ${msg}` },
      { status: 500 }
    );
  }
}
