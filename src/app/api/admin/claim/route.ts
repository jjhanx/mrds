import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  if (adminCount > 0) {
    return NextResponse.json(
      { error: "이미 관리자가 존재합니다" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "admin", status: "approved" },
  });

  return NextResponse.json({ success: true });
}
