import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await _request.json();
    const { name, slug, sortOrder } = body as {
      name?: string;
      slug?: string;
      sortOrder?: number;
    };

    const folder = await prisma.sheetMusicFolder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: "폴더를 찾을 수 없습니다" }, { status: 404 });
    }

    let slugNorm: string | undefined;
    if (name !== undefined && name.trim()) {
      const s = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      slugNorm = s.length >= 2 ? s : `folder-${id.slice(-8)}`;
    } else if (slug !== undefined) {
      slugNorm = String(slug).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || undefined;
    }
    if (slugNorm !== undefined && slugNorm !== folder.slug) {
      const existing = await prisma.sheetMusicFolder.findUnique({
        where: { slug: slugNorm },
      });
      if (existing) {
        slugNorm = `folder-${id.slice(-8)}-${Date.now().toString(36)}`;
      }
    }

    const updated = await prisma.sheetMusicFolder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slugNorm !== undefined && { slug: slugNorm }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Sheet music folder update error:", error);
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const folder = await prisma.sheetMusicFolder.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!folder) {
      return NextResponse.json({ error: "폴더를 찾을 수 없습니다" }, { status: 404 });
    }

    if (folder._count.items > 0) {
      return NextResponse.json(
        { error: "폴더 안에 항목이 있으면 삭제할 수 없습니다. 먼저 항목을 이동하거나 삭제하세요." },
        { status: 400 }
      );
    }

    await prisma.sheetMusicFolder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sheet music folder delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
