"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminClaimButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claim", { method: "POST" });
      if (res.ok) {
        router.refresh();
        router.push("/");
      } else {
        const data = await res.json();
        alert(data.error || "등록에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
    >
      {loading ? "처리 중..." : "관리자로 등록하기"}
    </button>
  );
}
