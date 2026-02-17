"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-6 py-2.5 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 font-medium"
    >
      로그아웃
    </button>
  );
}
