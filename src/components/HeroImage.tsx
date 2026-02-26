"use client";

const HERO_IMAGE = process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.jpg";

export function HeroImage() {
  return (
    <section className="relative w-full bg-black flex flex-col sm:block sm:h-[360px] md:h-[450px] overflow-hidden">

      {/* --- 모바일(작은 화면) 상단: 텍스트 영역 --- */}
      <div className="sm:hidden flex flex-col justify-center items-center py-10 px-4 bg-gradient-to-b from-stone-900 to-black z-10 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          미래도시
        </h1>
        <p className="text-lg mt-2 text-white/95">
          노래가 있는 삶
        </p>
      </div>

      {/* --- 모바일 하단 & 데스크탑 배경: 이미지 영역 --- */}
      <div className="relative h-[240px] w-full sm:absolute sm:inset-0 sm:h-full">
        <div className="absolute inset-0 bg-black" aria-hidden />
        <div className="absolute inset-0 sm:right-8 sm:left-0 sm:top-0 sm:bottom-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="미래도시 노래가 있는 삶"
            className="absolute right-0 top-0 h-full w-full sm:w-auto sm:max-w-full object-cover sm:object-contain object-center sm:object-right transition-opacity duration-300"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>

      {/* --- 데스크탑(sm 이상) 좌측: 텍스트 영역 --- */}
      <div className="hidden sm:flex absolute left-0 top-0 bottom-0 flex-col justify-center pl-8 pr-6 md:pl-10 md:pr-8 z-10 pointer-events-none">
        <div className="bg-transparent px-5 py-4 rounded-r-lg">
          <div className="w-max min-w-[240px]">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
              미래도시
            </h1>
            <p className="text-xl md:text-2xl mt-2 text-white/95 drop-shadow-md">
              노래가 있는 삶
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
