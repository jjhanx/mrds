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
    const userEmail = session.user.email;
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user && userEmail) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
    }
    if (!user) {
      return NextResponse.json(
        { error: "DB에서 사용자를 찾을 수 없습니다. 로그아웃 후 다시 로그인해 주세요." },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin", status: "approved" },
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
