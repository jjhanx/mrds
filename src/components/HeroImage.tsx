"use client";

const HERO_IMAGE = process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.jpg";

export function HeroImage() {
  return (
    <section className="relative h-[280px] sm:h-[360px] md:h-[450px] w-full overflow-hidden bg-stone-900">
      {/* 배경 그라데이션 (이미지 없을 때 fallback) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-stone-900"
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt="미래도시 함께 부르는 하모니"
        className="absolute inset-0 w-full h-full object-cover object-center"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-lg tracking-tight">
          미래도시
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl mt-2 opacity-95 drop-shadow-md">
          함께 부르는 하모니
        </p>
      </div>
    </section>
  );
}
