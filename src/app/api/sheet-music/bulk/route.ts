import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isFileAllowed, isFileSizeAllowed, getFolderHint, getMaxFileSizeLabel } from "@/constants/sheet-music";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const folderId = (formData.get("folderId") as string)?.trim() || null;

    const files = formData.getAll("files") as File[];
    const validFiles = files.filter((f) => f && f.size > 0);

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일을 선택해 주세요" },
        { status: 400 }
      );
    }

    let folderSlug = "";
    if (folderId) {
      const folder = await prisma.sheetMusicFolder.findUnique({
        where: { id: folderId },
        select: { slug: true },
      });
      folderSlug = (folder?.slug ?? "").toLowerCase();
    }

    const rejected = validFiles.filter(
      (f) => !isFileAllowed({ name: f.name, type: f.type }, folderSlug)
    );
    if (rejected.length > 0) {
      const hint = getFolderHint(folderSlug);
      return NextResponse.json(
        {
          error: `이 폴더에는 ${hint}만 업로드할 수 있습니다. (허용되지 않음: ${rejected.map((f) => f.name).join(", ")})`,
        },
        { status: 400 }
      );
    }

    const oversized = validFiles.filter(
      (f) => !isFileSizeAllowed(f.size, folderSlug)
    );
    if (oversized.length > 0) {
      const maxLabel = getMaxFileSizeLabel(folderSlug);
      return NextResponse.json(
        {
          error: `이 폴더는 파일당 최대 ${maxLabel}까지 허용됩니다. (초과: ${oversized.map((f) => f.name).join(", ")})`,
        },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "sheet-music");
    await mkdir(uploadDir, { recursive: true });

    const results: { id: string; title: string; filepath: string }[] = [];

    for (const file of validFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, buffer);
      const filepath = `/uploads/sheet-music/${filename}`;

      const title = file.name.replace(/\.[^.]+$/, "") || file.name;

      const created = await prisma.sheetMusic.create({
        data: {
          folderId,
          title,
          filepath,
        },
      });
      results.push({
        id: created.id,
        title: created.title,
        filepath: created.filepath,
      });
    }

    return NextResponse.json({ success: true, items: results });
  } catch (error) {
    console.error("Sheet music bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload" },
      { status: 500 }
    );
  }
}
