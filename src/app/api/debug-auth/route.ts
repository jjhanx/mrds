import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** 디버그용: 세션 여부 확인. 문제 해결 후 삭제 권장. */
export async function GET() {
  const session = await auth();
  return NextResponse.json({
    hasSession: !!session,
    userId: session?.user?.id,
    nextAuthUrl: process.env.NEXTAUTH_URL ? "설정됨" : "미설정",
  });
}
