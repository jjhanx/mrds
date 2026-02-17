import { NextResponse } from "next/server";

// 인증 없이 접근 가능 - 서버 동작 여부 확인용
export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
