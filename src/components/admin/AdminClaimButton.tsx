"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminClaimButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        router.refresh();
        router.push("/");
        return;
      }
      const text = await res.text();
      let errMsg = "등록에 실패했습니다.";
      try {
        const data = JSON.parse(text);
        if (data?.error) errMsg = data.error;
      } catch {
        if (text) errMsg = text.slice(0, 200);
      }
      if (res.status === 401) errMsg = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
      alert(errMsg);
    } catch (e) {
      alert("요청 중 오류가 발생했습니다: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={loading}
      className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
    >
      {loading ? "처리 중..." : "관리자로 등록하기"}
    </button>
  );
}
