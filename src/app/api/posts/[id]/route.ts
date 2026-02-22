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
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, image: true } },
        attachments: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Post fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const content = (formData.get("content") as string) ?? "";
    const files = formData.getAll("attachments") as File[];
    const hasNewAttachments = files?.length > 0 && files.some((f) => f?.size > 0);

    const existingAttachments = await prisma.postAttachment.count({ where: { postId: id } });
    const hasAttachments = existingAttachments > 0 || hasNewAttachments;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    if (!content.trim() && !hasAttachments) {
      return NextResponse.json(
        { error: "내용을 입력하거나 이미지/파일을 첨부해 주세요." },
        { status: 400 }
      );
    }

    await prisma.post.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content.trim() || "",
      },
    });

    const validFiles = files?.filter((f) => f?.size > 0) ?? [];
    if (validFiles.length > 0) {
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "attachments", id);
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
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        const relativePath = `/uploads/attachments/${id}/${filename}`;

        await prisma.postAttachment.create({
          data: {
            postId: id,
            filename: safeName,
            filepath: relativePath,
            fileType: file.type,
            fileSize: file.size,
          },
        });
      }
    }

    const updated = await prisma.post.findUnique({
      where: { id },
      include: { author: { select: { name: true, image: true } }, attachments: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Post update error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
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
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
