import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, image: true } },
        attachments: true,
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
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
    const content = (formData.get("content") as string) ?? "";
    const files = formData.getAll("attachments") as File[];
    const hasAttachments = files?.length > 0 && files.some((f) => f?.size > 0);

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    if (!content.trim() && !hasAttachments) {
      return NextResponse.json(
        { error: "내용을 입력하거나 이미지/파일을 첨부해 주세요." },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim() || "",
        authorId: session.user.id,
      },
      include: {
        author: { select: { name: true, image: true } },
      },
    });

    // 인라인 이미지: content의 {{INLINE_0}}, {{INLINE_1}} 등을 업로드 경로로 교체
    const validFiles = files?.filter((f) => f?.size > 0) ?? [];
    let finalContent = content.trim() || "";
    const inlinePaths: string[] = [];

    if (validFiles.length > 0) {
      const { writeFile, mkdir } = await import("fs/promises");
      const pathMod = await import("path");
      const uploadDir = pathMod.join(process.cwd(), "public", "uploads", "attachments", post.id);
      await mkdir(uploadDir, { recursive: true });

      const extFromType = (t: string) => {
        const m = t?.match(/image\/(\w+)/);
        return m ? m[1] : "png";
      };
      for (const file of validFiles) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const safeName = file.name?.trim() || `pasted-${Date.now()}.${extFromType(file.type)}`;
        const filename = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filepath = pathMod.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        const relativePath = `/uploads/attachments/${post.id}/${filename}`;
        inlinePaths.push(relativePath);

        await prisma.postAttachment.create({
          data: {
            postId: post.id,
            filename: safeName,
            filepath: relativePath,
            fileType: file.type,
            fileSize: file.size,
          },
        });
      }
      // src="{{INLINE_0}}" -> src="/uploads/..."
      for (let i = 0; i < inlinePaths.length; i++) {
        finalContent = finalContent.replace(
          new RegExp(`src="{{INLINE_${i}}}"`, "g"),
          `src="${inlinePaths[i]}"`
        );
      }
      await prisma.post.update({
        where: { id: post.id },
        data: { content: finalContent },
      });
    }

    const postWithAttachments = await prisma.post.findUnique({
      where: { id: post.id },
      include: { author: { select: { name: true, image: true } }, attachments: true },
    });

    return NextResponse.json(postWithAttachments);
  } catch (error) {
    console.error("Post create error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
