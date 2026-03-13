/**
 * 악보 자료실 복구 스크립트
 *
 * DB가 초기화되어 레코드만 사라진 경우, public/uploads/sheet-music/ 에
 * 파일이 아직 남아 있다면 이 스크립트로 DB 레코드를 다시 생성할 수 있습니다.
 *
 * 사용법: node scripts/recover-sheet-music.js [--folder=choir]
 *
 * 옵션:
 *   --folder=slug   복구한 자료를 넣을 폴더 (choir, art-song, nwc, utility, video, education)
 *                    생략 시 파일 확장자로 추정 (pdf/이미지→합창곡, 동영상→동영상, nwc→NWC)
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const UPLOAD_BASE = path.join(process.cwd(), "public", "uploads", "sheet-music");
const EXT_TO_FOLDER = {
  pdf: "choir",
  jpg: "choir",
  jpeg: "choir",
  png: "choir",
  gif: "choir",
  webp: "choir",
  mp4: "video",
  webm: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  m4v: "video",
  nwc: "nwc",
};

const DEFAULT_FOLDERS = [
  { name: "합창곡", slug: "choir", sortOrder: 0 },
  { name: "애창곡", slug: "art-song", sortOrder: 1 },
  { name: "NWC", slug: "nwc", sortOrder: 2 },
  { name: "Utility", slug: "utility", sortOrder: 3 },
  { name: "동영상", slug: "video", sortOrder: 4 },
  { name: "교육/연습", slug: "education", sortOrder: 5 },
];

async function ensureFolders() {
  for (const folder of DEFAULT_FOLDERS) {
    await prisma.sheetMusicFolder.upsert({
      where: { slug: folder.slug },
      update: { name: folder.name, sortOrder: folder.sortOrder },
      create: folder,
    });
  }
  console.log("기본 폴더 준비 완료");
}

async function getFolderIdBySlug(slug) {
  const folder = await prisma.sheetMusicFolder.findUnique({
    where: { slug },
    select: { id: true },
  });
  return folder?.id ?? null;
}

async function recoverMainFiles(forceFolderSlug) {
  if (!fs.existsSync(UPLOAD_BASE)) {
    console.log("업로드 디렉터리가 없습니다:", UPLOAD_BASE);
    return { main: 0, nwc: 0 };
  }

  const entries = fs.readdirSync(UPLOAD_BASE, { withFileTypes: true });
  const mainFiles = entries.filter((e) => e.isFile());
  const created = [];

  for (const entry of mainFiles) {
    const ext = (entry.name.split(".").pop() || "").toLowerCase();
    let folderSlug = forceFolderSlug || EXT_TO_FOLDER[ext] || "utility";
    const folderId = await getFolderIdBySlug(folderSlug);

    const filepath = `/uploads/sheet-music/${entry.name}`;
    const existing = await prisma.sheetMusic.findFirst({
      where: { filepath },
      select: { id: true },
    });
    if (existing) {
      console.log("  (이미 있음) " + entry.name);
      continue;
    }

    const title = entry.name
      .replace(/^\d+-[a-z0-9]+-/, "") // timestamp-random- 제거
      .replace(/\.[^.]+$/, ""); // 확장자 제거
    const finalTitle = title || entry.name;

    await prisma.sheetMusic.create({
      data: {
        folderId,
        title: finalTitle,
        filepath,
      },
    });
    created.push(entry.name);
  }

  return { main: created.length, files: created };
}

async function recoverNwcFiles(forceFolderSlug) {
  const nwcDir = path.join(UPLOAD_BASE, "nwc");
  if (!fs.existsSync(nwcDir)) {
    return { nwc: 0 };
  }

  const entries = fs.readdirSync(nwcDir, { withFileTypes: true });
  const nwcFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".nwc"));
  const created = [];

  const folderSlug = forceFolderSlug || "nwc";
  const folderId = await getFolderIdBySlug(folderSlug);

  for (const entry of nwcFiles) {
    const filepath = `/uploads/sheet-music/nwc/${entry.name}`;
    const existing = await prisma.sheetMusic.findFirst({
      where: { filepath },
      select: { id: true },
    });
    if (existing) continue;

    const title = entry.name
      .replace(/^\d+-[a-z0-9]+-/, "")
      .replace(/\.nwc$/i, "");
    const finalTitle = title || entry.name;

    await prisma.sheetMusic.create({
      data: {
        folderId,
        title: finalTitle,
        filepath,
      },
    });
    created.push(entry.name);
  }

  return { nwc: created.length, files: created };
}

async function main() {
  const args = process.argv.slice(2);
  let forceFolder = null;
  for (const a of args) {
    if (a.startsWith("--folder=")) {
      forceFolder = a.split("=")[1]?.trim() || null;
      break;
    }
  }

  console.log("악보 자료실 복구를 시작합니다...");
  console.log("업로드 경로:", UPLOAD_BASE);

  await ensureFolders();

  const mainResult = await recoverMainFiles(forceFolder);
  const nwcResult = await recoverNwcFiles(forceFolder);

  console.log("\n복구 완료:");
  console.log("  - 메인 악보:", mainResult.main, "건");
  if (mainResult.files?.length) {
    mainResult.files.forEach((f) => console.log("    +", f));
  }
  console.log("  - NWC 파일:", nwcResult.nwc, "건");
  if (nwcResult.files?.length) {
    nwcResult.files.forEach((f) => console.log("    +", f));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
