"use client";

const HERO_IMAGE = process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.jpg";

export function HeroImage() {
  return (
    <section className="relative h-[280px] sm:h-[360px] md:h-[450px] w-full overflow-hidden bg-black">
      {/* 배경 검정 */}
      <div className="absolute inset-0 bg-black" aria-hidden />
      {/* 히어로 이미지: 높이에 맞춤, 왼쪽으로 간격 절반 이동, 오른쪽 빈공간 검정 */}
      <div className="absolute right-6 sm:right-8 top-0 bottom-0 left-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="미래도시 노래가 있는 삶"
          className="absolute right-0 top-0 h-full w-auto max-w-full object-contain object-right"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
      {/* 텍스트: 배경 완전 검정 */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center pl-6 pr-4 sm:pl-8 sm:pr-6 md:pl-10 md:pr-8">
        <div className="bg-transparent px-4 py-3 sm:px-5 sm:py-4 rounded-r-lg">
          <div className="w-max min-w-[200px] sm:min-w-[240px]">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              미래도시
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mt-1.5 sm:mt-2 text-white/95">
              노래가 있는 삶
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
