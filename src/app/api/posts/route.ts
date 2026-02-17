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
    const content = formData.get("content") as string;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        authorId: session.user.id,
      },
      include: {
        author: { select: { name: true, image: true } },
      },
    });

    // Handle file attachments
    const files = formData.getAll("attachments") as File[];
    if (files?.length && files[0]?.name) {
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "attachments", post.id);
      await mkdir(uploadDir, { recursive: true });

      const attachments = [];
      for (const file of files) {
        if (file.size === 0) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        const relativePath = `/uploads/attachments/${post.id}/${filename}`;

        const att = await prisma.postAttachment.create({
          data: {
            postId: post.id,
            filename: file.name,
            filepath: relativePath,
            fileType: file.type,
            fileSize: file.size,
          },
        });
        attachments.push(att);
      }
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
