"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Music2, MessageSquare, FileMusic, LogOut, MessageCircle, Shield } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const status = (session?.user as { status?: string })?.status;

  const navItems = [
    { href: "/", label: "홈", icon: Music2 },
    ...(status === "approved"
      ? [
        { href: "/board", label: "게시판", icon: MessageSquare },
        { href: "/sheet-music", label: "악보 자료실", icon: FileMusic },
        { href: "/chat", label: "채팅", icon: MessageCircle },
      ]
      : []),
    ...(role === "admin" ? [{ href: "/admin", label: "관리", icon: Shield }] : []),
  ];

  return (
    <header className="bg-white/90 backdrop-blur border-b border-amber-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <nav className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-amber-700 hover:text-amber-800 font-semibold"
          >
            <Music2 className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-lg sm:text-xl">미래도시</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 sm:gap-2 px-2 py-2 md:px-4 rounded-lg font-medium transition-colors ${pathname === href || (href !== "/" && pathname.startsWith(href))
                    ? "bg-amber-100 text-amber-800"
                    : "text-stone-600 hover:bg-amber-50 hover:text-amber-800"
                  }`}
                title={label}
              >
                <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm md:text-base">{label}</span>
              </Link>
            ))}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors text-sm"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
