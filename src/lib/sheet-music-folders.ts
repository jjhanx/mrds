import { prisma } from "@/lib/prisma";
import { SCORE_FOLDER_SLUGS } from "@/constants/sheet-music";

const DEFAULT_FOLDERS: { name: string; slug: string; sortOrder: number }[] = [
  { name: "합창곡", slug: "choir", sortOrder: 0 },
  { name: "애창곡", slug: "art-song", sortOrder: 1 },
  { name: "NWC", slug: "nwc", sortOrder: 2 },
  { name: "Utility", slug: "utility", sortOrder: 3 },
  { name: "동영상", slug: "video", sortOrder: 4 },
  { name: "교육/연습", slug: "education", sortOrder: 5 },
];

export async function ensureDefaultFolders(): Promise<void> {
  const existing = await prisma.sheetMusicFolder.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((f) => f.slug));
  const toCreate = DEFAULT_FOLDERS.filter((f) => !existingSlugs.has(f.slug));
  for (const folder of toCreate) {
    const exists = await prisma.sheetMusicFolder.findUnique({
      where: { slug: folder.slug },
    });
    if (!exists) {
      await prisma.sheetMusicFolder.create({ data: folder });
    }
  }
}
