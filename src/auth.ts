import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const hasOAuth =
  (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) ||
  (process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET) ||
  (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET);

const isHttps = process.env.NEXTAUTH_URL?.startsWith("https://");

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true, // nginx 등 프록시 뒤에서 필수
  useSecureCookies: isHttps, // HTTPS 도메인에서는 Secure 쿠키 필수
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      })]
      : []),
    ...(process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET
      ? [Naver({
        clientId: process.env.AUTH_NAVER_ID,
        clientSecret: process.env.AUTH_NAVER_SECRET,
        allowDangerousEmailAccountLinking: true,
      })]
      : []),
    ...(process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET
      ? [Kakao({
        clientId: process.env.AUTH_KAKAO_ID,
        clientSecret: process.env.AUTH_KAKAO_SECRET,
        allowDangerousEmailAccountLinking: true,
        profile(profile) {
          return {
            id: profile.id.toString(),
            name: profile.kakao_account?.profile?.nickname || profile.properties?.nickname || "카카오 유저",
            email: profile.kakao_account?.email,
            image: profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image,
          };
        },
      })]
      : []),
    // 일반 사용자: 이름 + 비밀번호 가입/로그인 제공
    Credentials({
      id: "custom",
      name: "일반 회원가입/로그인",
      credentials: {
        name: { label: "이름", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) return null;
        const name = (credentials.name as string).trim();
        const password = credentials.password as string;

        const pwdHash = crypto.createHash('sha256').update(password).digest('hex');

        // Find existing custom user with this name
        let user = await prisma.user.findFirst({
          where: { name, password: { not: null } }
        });

        if (!user) {
          // Create new custom user if name is not taken by another custom user
          user = await prisma.user.create({
            data: {
              name,
              password: pwdHash,
              status: "pending",
              role: "member"
            }
          });
          return { id: user.id, name: user.name, status: user.status, role: user.role };
        } else {
          // Verify password
          if (user.password === pwdHash) {
            return { id: user.id, name: user.name, status: user.status, role: user.role };
          } else {
            throw new Error("비밀번호가 일치하지 않습니다.");
          }
        }
      }
    }),
    // 개발용: 첫 사용자 자동 관리자 등
    ...(!hasOAuth
      ? [
        Credentials({
          id: "dev",
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
    // SQLite는 Edge 런타임(미들웨어)에서 불가 → JWT 사용 (쿠키에 세션 저장)
    strategy: "jwt",
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
    async session({ session, token }) {
      const userId = token?.sub as string;
      if (session.user && userId) {
        session.user.id = userId;
        session.user.status = (token?.status as string) ?? "pending";
        session.user.role = (token?.role as string) ?? "member";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        // signIn 직후 DB에서 최신 status/role 조회 (첫 사용자 admin 반영)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { status: true, role: true },
        });
        token.status = dbUser?.status ?? (user as { status?: string })?.status ?? "pending";
        token.role = dbUser?.role ?? (user as { role?: string })?.role ?? "member";
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
