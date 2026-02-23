import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: Request,
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

    const formData = await request.formData();

    // NWC 파일
    const nwcFile = formData.get("nwcFile") as File | null;
    if (nwcFile && nwcFile.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "sheet-music", "nwc");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await nwcFile.arrayBuffer();
      const filename = `${Date.now()}-${nwcFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, Buffer.from(bytes));
      await prisma.sheetMusicNwcFile.create({
        data: {
          sheetMusicId: id,
          filepath: `/uploads/sheet-music/nwc/${filename}`,
        },
      });
    }

    // 연습 동영상 (URL)
    const videoUrl = (formData.get("videoUrl") as string)?.trim();
    if (videoUrl) {
      await prisma.sheetMusicVideo.create({
        data: {
          sheetMusicId: id,
          part: "full",
          videoUrl,
        },
      });
    }

    const updated = await prisma.sheetMusic.findUnique({
      where: { id },
      include: { nwcFiles: true, videos: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Attachment add error:", error);
    return NextResponse.json(
      { error: "Failed to add attachment" },
      { status: 500 }
    );
  }
}
