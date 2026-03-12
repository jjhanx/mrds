import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isFileAllowed, isFileSizeAllowed, getFolderHint, getMaxFileSizeLabel } from "@/constants/sheet-music";
import { transcodeToH264 } from "@/lib/transcode-video";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// pdf-lib을 사용해 PDF를 재저장(무료손실 재생성)하여 pdf.js가 못 읽는 문서들을 보정
import { PDFDocument } from "pdf-lib";

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
      let bytes = await file.arrayBuffer();
      let buffer = Buffer.from(bytes);
      let outExt = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
      if (!outExt && file.type === "application/pdf") outExt = "pdf";
      if (!outExt && file.type?.startsWith("image/")) outExt = file.type.split("/")[1] || "png";
      if (!outExt && file.type?.startsWith("video/")) outExt = "mp4";
      if (!outExt) outExt = "bin";
      const mime = file.type || "application/octet-stream";
      if (mime.startsWith("video/")) {
        const transcoded = await transcodeToH264(buffer, mime);
        if (transcoded && transcoded.length > 0) {
          buffer = Buffer.from(transcoded);
          outExt = "mp4";
        }
      }
      // PDF 특수 파일에 대한 보정: pdf-lib으로 로드/저장하여 간혹 pdf.js가 빈 페이지를 출력하는 문제를 완화
      if (outExt === "pdf") {
        try {
          const pdfDoc = await PDFDocument.load(buffer);
          buffer = Buffer.from(await pdfDoc.save());
        } catch (normErr) {
          console.warn("PDF normalization failed", normErr);
        }
      }
      // Use purely random ASCII filenames to prevent Nginx/Linux 404 NFD/NFC encoding mismatches
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${outExt}`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, buffer);
      // qpdf linearize on disk if available
      if (outExt === "pdf") {
        try {
          const { execFile } = await import("child_process");
          const tmp = `${fullPath}.qpdf.tmp`;
          await new Promise<void>((resolve, reject) => {
            execFile("qpdf", ["--linearize", fullPath, tmp], (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          const { rename } = await import("fs/promises");
          await rename(tmp, fullPath);
        } catch {
          // ignore
        }
      }
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
