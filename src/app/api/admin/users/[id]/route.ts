import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        // Do not allow an admin to delete themselves to prevent locking out the admin account entirely
        if (session.user.id === id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete user:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

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
        const body = await request.json();

        if (!body.name || typeof body.name !== 'string') {
            return new NextResponse("Invalid or missing name", { status: 400 });
        }

        const name = body.name.trim().slice(0, 30);

        await prisma.user.update({
            where: { id },
            data: { name }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update user:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
