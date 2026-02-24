"use client";

import { useState } from "react";

interface IntroFormProps {
  initialIntro: string | null;
  initialName: string | null;
  onSaved?: () => void;
}

export function IntroForm({ initialIntro, initialName, onSaved }: IntroFormProps) {
  const [intro, setIntro] = useState(initialIntro || "");
  const [name, setName] = useState(initialName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users/me/intro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          introMessage: intro.trim() || null,
          name: name.trim() || null
        }),
      });
      if (res.ok) {
        setSaved(true);
        onSaved?.();
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json();
        alert(data.error || "저장에 실패했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="text-left space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          이름 (또는 닉네임)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="가입 신청 시 사용할 이름을 입력해 주세요."
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          maxLength={30}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          자기 소개 (관리자가 가입을 판단하는 데 참고합니다)
        </label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="이름, 참여 동기, 경험 등을 간단히 작성해 주세요."
          className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[120px] resize-y"
          maxLength={500}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-stone-500">{intro.length}/500자</span>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "저장 중..." : saved ? "저장됨!" : "저장"}
          </button>
        </div>
    </form>
  );
}
