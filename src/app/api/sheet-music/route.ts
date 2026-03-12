import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") ?? undefined;
    const q = searchParams.get("q")?.trim() || undefined;

    let where: any = {};
    if (q) {
      // apply text filter; if folderId also given, require that too
      const textFilter = {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { composer: { contains: q, mode: "insensitive" } },
          { textContent: { contains: q, mode: "insensitive" } },
        ],
      };
      if (folderId) {
        where = { AND: [{ folderId }, textFilter] };
      } else {
        where = textFilter;
      }
    } else if (folderId) {
      where.folderId = folderId;
    }

    const sheetMusic = await prisma.sheetMusic.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        folder: true,
        videos: true,
        nwcFiles: true,
      },
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
    const folderId = (formData.get("folderId") as string)?.trim() || null;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "악보 제목은 필수입니다" },
        { status: 400 }
      );
    }

    let filepath = "";
    let textContent: string | undefined;
    const file = formData.get("file") as File | null;
    if (file && (file.size ?? 0) > 0) {
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "sheet-music");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      let buffer = Buffer.from(bytes);
      let ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
      if (!ext && file.type === "application/pdf") ext = "pdf";
      if (!ext && file.type?.startsWith("image/")) ext = file.type.split("/")[1] || "png";
      // PDF 처리: pdf-lib 로드/저장 후 QPDF linearize (있다면)로 보정
      if (ext === "pdf") {
        // pdf-lib normalization
        try {
          const { PDFDocument } = await import("pdf-lib");
          const pdfDoc = await PDFDocument.load(buffer);
          buffer = Buffer.from(await pdfDoc.save());
        } catch (err) {
          console.warn("PDF normalization failed", err);
        }
        // 텍스트 추출
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          textContent = parsed.text;
        } catch (err) {
          console.warn("PDF text extraction failed", err);
        }
      }
      // Use purely random ASCII filenames to prevent Nginx/Linux 404 NFD/NFC encoding mismatches
      const filename = ext ? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}` : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, buffer);
      // QPDF linearize in-place if available
      if (ext === "pdf") {
        try {
          const { execFile } = await import("child_process");
          const tmp = `${fullPath}.qpdf.tmp`;
          await new Promise<void>((resolve, reject) => {
            execFile("qpdf", ["--linearize", fullPath, tmp], (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          // replace original
          const { rename } = await import("fs/promises");
          await rename(tmp, fullPath);
        } catch (err) {
          // ignore if qpdf not installed or fails
        }
      }
      filepath = `/uploads/sheet-music/${filename}`;
    } else {
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
        folderId,
        title: title.trim(),
        description: description?.trim() || null,
        composer: composer?.trim() || null,
        filepath,
        textContent: textContent || null,
      },
    });

    // NWC 파일들 (복수)
    const nwcFile = formData.get("nwcFile") as File | null;
    const nwcFileUrl = (formData.get("nwcFileUrl") as string)?.trim();
    if (nwcFile && nwcFile.size > 0) {
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "sheet-music", "nwc");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await nwcFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      // Safe random filename to avoid encoding issues
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.nwc`;
      const fullPath = path.join(uploadDir, filename);
      await writeFile(fullPath, buffer);
      await prisma.sheetMusicNwcFile.create({
        data: {
          sheetMusicId: sheetMusic.id,
          filepath: `/uploads/sheet-music/nwc/${filename}`,
        },
      });
    } else if (nwcFileUrl) {
      await prisma.sheetMusicNwcFile.create({
        data: {
          sheetMusicId: sheetMusic.id,
          filepath: nwcFileUrl,
        },
      });
    }

    // 파트별 영상
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
      include: { folder: true, videos: true, nwcFiles: true },
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
