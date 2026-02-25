import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        // Validate target post exists
        const post = await prisma.post.findUnique({
            where: { id },
            select: { isFixed: true },
        });

        if (!post) {
            return new NextResponse("Post not found", { status: 404 });
        }

        // Toggle the fixed state
        const updatedPost = await prisma.post.update({
            where: { id },
            data: { isFixed: !post.isFixed },
        });

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error("Failed to toggle fixed status:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
