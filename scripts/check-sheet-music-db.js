/**
 * 악보 DB 상태 진단 스크립트
 * 
 * 복구 후에도 자료가 안 보일 때, DB·경로·테이블 구조를 확인합니다.
 * 
 * 사용법: node scripts/check-sheet-music-db.js
 */

require("dotenv").config({ path: require("path").join(process.cwd(), ".env") });
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "(없음)";
  console.log("=== 악보 DB 진단 ===\n");
  console.log("1. DATABASE_URL:", dbUrl.replace(/"[^"]*"/g, (m) => m.slice(0, 50) + "..."));
  console.log("   실제 경로 해석:");
  const match = dbUrl.match(/file:(.+)/);
  if (match) {
    const p = match[1].trim();
    const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), "prisma", p.replace(/^\.\//, ""));
    console.log("   ", resolved);
    const fs = require("fs");
    const exists = fs.existsSync(resolved);
    console.log("   파일 존재:", exists ? "예" : "아니오");
  }
  console.log("\n2. 현재 작업 경로:", process.cwd());

  try {
    const count = await prisma.sheetMusic.count();
    console.log("\n3. SheetMusic 레코드 수:", count);

    const folders = await prisma.sheetMusicFolder.findMany({ orderBy: { sortOrder: "asc" } });
    console.log("\n4. 폴더 수:", folders.length);
    folders.forEach((f) => console.log("   -", f.slug, ":", f.name));

    if (count > 0) {
      const sample = await prisma.sheetMusic.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        include: { folder: true },
      });
      console.log("\n5. 최근 3건 샘플:");
      sample.forEach((s, i) => {
        console.log(`   [${i + 1}] id=${s.id.slice(0, 12)}... title="${s.title?.slice(0, 30)}..." folderId=${s.folderId || "null"} folder=${s.folder?.slug || "-"}`);
      });
    }

    const withFolder = await prisma.sheetMusic.count({ where: { folderId: { not: null } } });
    const withoutFolder = await prisma.sheetMusic.count({ where: { folderId: null } });
    console.log("\n6. folderId 분포: 있음=" + withFolder + ", 없음=" + withoutFolder);
  } catch (e) {
    console.error("\n오류:", e.message);
    if (e.code === "P2022" || e.message?.includes("does not exist")) {
      console.log("\n→ 스키마와 DB 구조가 맞지 않을 수 있습니다.");
      console.log("  서버에서 다음으로 테이블 구조 확인:");
      console.log('  sqlite3 <DB파일경로> ".schema SheetMusic"');
    }
  }

  console.log("\n=== 끝 ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
