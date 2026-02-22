import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const hasOAuth =
  (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) ||
  (process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET) ||
  (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
    ...(process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET
      ? [Naver({ clientId: process.env.AUTH_NAVER_ID, clientSecret: process.env.AUTH_NAVER_SECRET })]
      : []),
    ...(process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET
      ? [Kakao({ clientId: process.env.AUTH_KAKAO_ID, clientSecret: process.env.AUTH_KAKAO_SECRET })]
      : []),
    // 개발용: OAuth 미설정 시 테스트 로그인 (비밀번호: test)
    ...(!hasOAuth
      ? [
          Credentials({
            name: "개발용 로그인",
            credentials: {
              email: { label: "이메일", type: "email" },
              password: { label: "비밀번호", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.password === "test" && credentials?.email) {
                const email = credentials.email as string;
                const userCount = await prisma.user.count();
                const isFirst = userCount === 0;
                const user = await prisma.user.upsert({
                  where: { email },
                  update: {},
                  create: {
                    email,
                    name: email.split("@")[0],
                    status: isFirst ? "approved" : "pending",
                    role: isFirst ? "admin" : "member",
                  },
                });
                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  image: user.image,
                  status: user.status,
                  role: user.role,
                };
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: hasOAuth ? "database" : "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth 로그인 시: 관리자가 없으면 첫 로그인자를 자동 관리자+승인
      if (account?.provider && account.provider !== "credentials" && user?.email) {
        const adminCount = await prisma.user.count({ where: { role: "admin" } });
        if (adminCount === 0) {
          await prisma.user.update({
            where: { email: user.email },
            data: { role: "admin", status: "approved" },
          });
        }
      }
      return true;
    },
    async session({ session, user, token }) {
      const userId = (user?.id as string) || (token?.sub as string) || "";
      if (session.user && userId) {
        session.user.id = userId;
        // DB에서 최신 status/role 조회 (signIn 직후 반영 보장)
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { status: true, role: true },
        });
        if (dbUser) {
          session.user.status = dbUser.status;
          session.user.role = dbUser.role;
        } else {
          session.user.status = (user as { status?: string })?.status ?? (token?.status as string);
          session.user.role = (user as { role?: string })?.role ?? (token?.role as string);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.status = (user as { status?: string })?.status;
        token.role = (user as { role?: string })?.role;
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
