import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
