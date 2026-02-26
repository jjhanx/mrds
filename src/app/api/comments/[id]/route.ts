import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
        }

        const content = formData.get("content") as string;
        const files = formData.getAll("attachments") as File[];

        if (!content && files.length === 0) {
            return NextResponse.json({ error: "Missing content" }, { status: 400 });
        }

        const comment = await prisma.comment.findUnique({
            where: { id },
        });

        if (!comment) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (comment.authorId !== session.user.id && session.user.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        let finalContent = content.trim();
        const validFiles = files.filter((f) => f && typeof f.arrayBuffer === "function");

        if (validFiles.length > 0) {
            const uploadDir = path.join(process.cwd(), "public", "uploads", "comments", comment.id);
            await mkdir(uploadDir, { recursive: true });

            const inlinePaths: string[] = [];

            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                const bytes = await file.arrayBuffer();
                if (bytes.byteLength === 0) continue;

                const buffer = Buffer.from(bytes);
                const mime = file.type || "image/png";

                let outExt = "png";
                if (mime.startsWith("image/")) outExt = mime.split("/")[1];
                if (mime === "video/mp4") outExt = "mp4";
                if (mime === "video/webm") outExt = "webm";
                if (mime === "video/quicktime") outExt = "mov";

                const safeName = (file.name?.trim() || `pasted-${Date.now()}`).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");
                const filename = `${Date.now()}-${i}-${safeName}.${outExt}`;
                const filepath = path.join(uploadDir, filename);

                await writeFile(filepath, buffer);
                const relativePath = `/uploads/comments/${comment.id}/${filename}`;
                inlinePaths.push(relativePath);
            }

            for (let i = 0; i < inlinePaths.length; i++) {
                const placeholder = `src="{{INLINE_${i}}}"`;
                const escaped = placeholder.replace(/[{}]/g, "\\$&");
                finalContent = finalContent.replace(new RegExp(escaped, "g"), `src="${inlinePaths[i]}"`);
            }
        }

        const updatedComment = await prisma.comment.update({
            where: { id },
            data: { content: finalContent },
            include: { author: { select: { name: true, image: true } } },
        });

        return NextResponse.json(updatedComment);
    } catch (error) {
        console.error("[COMMENT_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const comment = await prisma.comment.findUnique({
            where: { id },
        });

        if (!comment) {
            return new NextResponse("Not Found", { status: 404 });
        }

        if (comment.authorId !== session.user.id && session.user.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        await prisma.comment.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[COMMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
