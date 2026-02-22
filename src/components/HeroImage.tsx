"use client";

const HERO_IMAGE = process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.jpg";

export function HeroImage() {
  return (
    <section className="relative h-[280px] sm:h-[360px] md:h-[450px] w-full overflow-hidden bg-stone-900">
      {/* 배경 (이미지 없을 때 fallback, 이미지 배경색과 맞춤) */}
      <div className="absolute inset-0 bg-stone-900" aria-hidden />
      {/* 히어로 이미지: 높이에 맞춤, 오른쪽 정렬 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt="미래도시 친구와 함께 부르는 노래"
        className="absolute right-0 top-0 h-full w-auto max-w-full object-contain object-right"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      {/* 텍스트: 왼쪽 여백에 배치, 이미지 배경색과 동일 */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center pl-6 pr-4 sm:pl-8 sm:pr-6 md:pl-10 md:pr-8">
        <div className="bg-stone-900 px-4 py-3 sm:px-5 sm:py-4 rounded-r-lg">
          <div className="w-max min-w-[200px] sm:min-w-[240px]">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              미래도시
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mt-1.5 sm:mt-2 text-white/95">
              친구와 함께 부르는 노래
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
