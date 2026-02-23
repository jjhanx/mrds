import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sheetMusic = await prisma.sheetMusic.findUnique({
      where: { id },
      include: { videos: true, nwcFiles: true, folder: true },
    });

    if (!sheetMusic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(sheetMusic);
  } catch (error) {
    console.error("Sheet music fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet music" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title } = body as { title?: string };

    const sheetMusic = await prisma.sheetMusic.findUnique({ where: { id } });
    if (!sheetMusic) {
      return NextResponse.json({ error: "악보를 찾을 수 없습니다" }, { status: 404 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요" }, { status: 400 });
    }

    const updated = await prisma.sheetMusic.update({
      where: { id },
      data: { title: title.trim() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Sheet music update error:", error);
    return NextResponse.json(
      { error: "Failed to update sheet music" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sheetMusic = await prisma.sheetMusic.findUnique({ where: { id } });
    if (!sheetMusic) {
      return NextResponse.json({ error: "악보를 찾을 수 없습니다" }, { status: 404 });
    }

    await prisma.sheetMusic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sheet music delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete sheet music" },
      { status: 500 }
    );
  }
}
