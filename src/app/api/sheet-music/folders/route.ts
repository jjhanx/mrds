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

    const body = await request.json();
    const { name, slug, sortOrder } = body as {
      name?: string;
      slug?: string;
      sortOrder?: number;
    };

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "폴더 이름과 slug는 필수입니다" },
        { status: 400 }
      );
    }

    const slugNorm = slug.trim().toLowerCase().replace(/\s+/g, "-");
    const existing = await prisma.sheetMusicFolder.findUnique({
      where: { slug: slugNorm },
    });
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 slug입니다" },
        { status: 400 }
      );
    }

    const folder = await prisma.sheetMusicFolder.create({
      data: {
        name: name.trim(),
        slug: slugNorm,
        sortOrder: sortOrder ?? 0,
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
