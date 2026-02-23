const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_FOLDERS = [
  { name: "합창곡", slug: "choir", sortOrder: 0 },
  { name: "애창곡", slug: "art-song", sortOrder: 1 },
  { name: "NWC", slug: "nwc", sortOrder: 2 },
  { name: "Utility", slug: "utility", sortOrder: 3 },
  { name: "동영상", slug: "video", sortOrder: 4 },
  { name: "교육/연습", slug: "education", sortOrder: 5 },
];

async function main() {
  for (const folder of DEFAULT_FOLDERS) {
    await prisma.sheetMusicFolder.upsert({
      where: { slug: folder.slug },
      update: { name: folder.name, sortOrder: folder.sortOrder },
      create: folder,
    });
  }
  console.log("기본 폴더 6개 준비 완료:", DEFAULT_FOLDERS.map((f) => f.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
