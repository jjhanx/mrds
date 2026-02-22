import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user as { status?: string; role?: string } | undefined;
  const status = user?.status ?? "approved";
  const role = user?.role ?? "member";

  // 공개 경로
  const publicPaths = ["/login", "/api/auth", "/api/health", "/api/debug-auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) return;

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // 승인 대기 사용자: /pending, 소개 수정 API만 접근 가능
  if (status === "pending") {
    if (
      pathname === "/pending" ||
      pathname.startsWith("/api/admin/claim") ||
      pathname === "/api/users/me/intro"
    )
      return;
    return Response.redirect(new URL("/pending", req.nextUrl.origin));
  }

  // 거절된 사용자: 로그아웃 유도
  if (status === "rejected") {
    if (pathname.startsWith("/api/auth")) return;
    return Response.redirect(new URL("/login?error=rejected", req.nextUrl.origin));
  }

  // 관리자 전용 경로 (단, /admin/claim은 관리자 없을 때 접근 가능)
  if (pathname.startsWith("/admin") && pathname !== "/admin/claim" && role !== "admin") {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)",
  ],
};
