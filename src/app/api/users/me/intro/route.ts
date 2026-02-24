import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.status !== "pending") {
    return NextResponse.json(
      { error: "승인 대기 상태에서만 소개를 수정할 수 있습니다" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const introMessage = (body.introMessage as string)?.trim().slice(0, 500) || null;
  const name = (body.name as string)?.trim().slice(0, 30) || (user.name ?? null);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { introMessage, name },
  });

  return NextResponse.json({ success: true });
}
