import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sheetMusic = await prisma.sheetMusic.findMany({
      orderBy: { createdAt: "desc" },
      include: { videos: true },
    });

    return NextResponse.json(sheetMusic);
  } catch (error) {
    console.error("Sheet music fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet music" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const composer = formData.get("composer") as string;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "악보 제목은 필수입니다" },
        { status: 400 }
      );
    }

    let filepath = "";
    const file = formData.get("file") as File | null;
    if (file && (file.size ?? 0) > 0) {
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "sheet-music");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, buffer);
      filepath = `/uploads/sheet-music/${filename}`;
    } else {
      // Allow URL as filepath for external scores
      const fileUrl = formData.get("fileUrl") as string;
      if (fileUrl?.trim()) filepath = fileUrl;
    }

    if (!filepath) {
      return NextResponse.json(
        { error: "악보 파일 또는 URL을 입력해 주세요" },
        { status: 400 }
      );
    }

    const sheetMusic = await prisma.sheetMusic.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        composer: composer?.trim() || null,
        filepath,
      },
    });

    // Add video links by part
    const parts = ["soprano", "alto", "tenor", "bass", "full"] as const;
    for (const part of parts) {
      const url = formData.get(`video_${part}`) as string;
      if (url?.trim()) {
        await prisma.sheetMusicVideo.create({
          data: { sheetMusicId: sheetMusic.id, part, videoUrl: url.trim() },
        });
      }
    }

    const result = await prisma.sheetMusic.findUnique({
      where: { id: sheetMusic.id },
      include: { videos: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sheet music create error:", error);
    return NextResponse.json(
      { error: "Failed to create sheet music" },
      { status: 500 }
    );
  }
}
