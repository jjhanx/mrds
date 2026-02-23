import { prisma } from "@/lib/prisma";
import { SCORE_FOLDER_SLUGS } from "@/constants/sheet-music";

const DEFAULT_FOLDERS: { name: string; slug: string; sortOrder: number }[] = [
  { name: "합창곡", slug: "choir", sortOrder: 0 },
  { name: "애창곡", slug: "art-song", sortOrder: 1 },
  { name: "Utility", slug: "utility", sortOrder: 2 },
  { name: "동영상", slug: "video", sortOrder: 3 },
  { name: "교육/연습", slug: "education", sortOrder: 4 },
];

export async function ensureDefaultFolders(): Promise<void> {
  const count = await prisma.sheetMusicFolder.count();
  if (count > 0) return;

  await prisma.sheetMusicFolder.createMany({
    data: DEFAULT_FOLDERS,
  });
}
