import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { status?: string };
  if (user.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const messages = await prisma.chatMessage.findMany({
    take: limit,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return NextResponse.json(messages.reverse());
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { status?: string };
  if (user.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const content = (body.content as string)?.trim();
  if (!content || content.length > 2000) {
    return NextResponse.json(
      { error: "메시지는 1~2000자여야 합니다" },
      { status: 400 }
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      content,
      senderId: session.user.id,
    },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return NextResponse.json(message);
}
