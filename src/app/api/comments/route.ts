import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get("postId");
        const sheetMusicId = searchParams.get("sheetMusicId");

        if (!postId && !sheetMusicId) {
            return new NextResponse("Missing query params", { status: 400 });
        }

        const comments = await prisma.comment.findMany({
            where: {
                ...(postId ? { postId } : {}),
                ...(sheetMusicId ? { sheetMusicId } : {}),
            },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("[COMMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (e) {
            return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
        }

        const content = (formData.get("content") as string) ?? "";
        const postId = formData.get("postId") as string | null;
        const sheetMusicId = formData.get("sheetMusicId") as string | null;
        const files = formData.getAll("attachments") as File[];

        if (!content.trim() && files.length === 0) {
            return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
        }
        if (!postId && !sheetMusicId) {
            return NextResponse.json({ error: "Missing target id" }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                ...(postId ? { postId } : {}),
                ...(sheetMusicId ? { sheetMusicId } : {}),
            },
            include: {
                author: {
                    select: { name: true, image: true },
                },
            },
        });

        const validFiles = files.filter((f) => f && typeof f.arrayBuffer === "function");
        let finalContent = content.trim();

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

            await prisma.comment.update({
                where: { id: comment.id },
                data: { content: finalContent },
            });
            comment.content = finalContent;
        }

        return NextResponse.json(comment);
    } catch (error) {
        console.error("[COMMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
