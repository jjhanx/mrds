import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "이미 관리자가 존재합니다" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? `admin-${userId}@local`;
    const userName = session.user.name ?? "관리자";

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userEmail,
        name: userName,
        image: session.user.image ?? undefined,
        status: "approved",
        role: "admin",
      },
      update: {
        role: "admin",
        status: "approved",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin claim error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `관리자 등록 실패: ${msg}` },
      { status: 500 }
    );
  }
}
