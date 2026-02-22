import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }
  if (targetUser.status !== "approved") {
    return NextResponse.json(
      { error: "승인된 회원만 관리자로 지정할 수 있습니다" },
      { status: 400 }
    );
  }
  if (targetUser.role === "admin") {
    return NextResponse.json(
      { error: "이미 관리자입니다" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id },
    data: { role: "admin" },
  });

  return NextResponse.json({ success: true });
}
