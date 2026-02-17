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
    const sheetMusic = await prisma.sheetMusic.findUnique({
      where: { id },
      include: { videos: true },
    });

    if (!sheetMusic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(sheetMusic);
  } catch (error) {
    console.error("Sheet music fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet music" },
      { status: 500 }
    );
  }
}
