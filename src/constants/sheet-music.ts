/** 합창곡/애창곡 slug — 이 폴더는 악보(PDF/이미지) + NWC + 동영상 첨부 가능 (클라이언트/서버 공용) */
export const SCORE_FOLDER_SLUGS: readonly string[] = ["choir", "art-song"];

/** 폴더별 허용 파일 확장자. "*" = 모든 포맷 허용 */
export const FOLDER_FORMAT_RULES: Record<
  string,
  { exts: readonly string[]; hint: string }
> = {
  choir: {
    exts: ["pdf", "jpg", "jpeg", "png", "gif", "webp"],
    hint: "PDF, 이미지 파일",
  },
  "art-song": {
    exts: ["pdf", "jpg", "jpeg", "png", "gif", "webp"],
    hint: "PDF, 이미지 파일",
  },
  nwc: {
    exts: ["nwc"],
    hint: "NWC 파일",
  },
  utility: {
    exts: ["*"],
    hint: "모든 포맷",
  },
  video: {
    exts: ["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "wmv"],
    hint: "동영상 (MP4, WebM 등)",
  },
  education: {
    exts: ["*"],
    hint: "모든 포맷",
  },
};

const ALL_FORMAT_SLUGS = ["utility", "education"];

/** 폴더별 최대 파일 크기 (바이트). 모든 폴더 2GB */
const MAX_2GB = 2 * 1024 * 1024 * 1024;
export const FOLDER_SIZE_LIMITS: Record<string, number> = {
  choir: MAX_2GB,
  "art-song": MAX_2GB,
  nwc: MAX_2GB,
  utility: MAX_2GB,
  video: MAX_2GB,
  education: MAX_2GB,
};

export function getMaxFileSizeBytes(slug: string): number {
  const key = (slug || "").toLowerCase();
  return FOLDER_SIZE_LIMITS[key] ?? MAX_2GB;
}

export function isFileSizeAllowed(size: number, slug: string): boolean {
  return size <= getMaxFileSizeBytes(slug);
}

export function getMaxFileSizeLabel(slug: string): string {
  const bytes = getMaxFileSizeBytes(slug);
  if (bytes >= 2 * 1024 * 1024 * 1024) return "2GB";
  if (bytes >= 1024 * 1024) return "100MB";
  return `${Math.round(bytes / 1024)}KB`;
}

export function getAllowedExts(slug: string): readonly string[] {
  const key = (slug || "").toLowerCase();
  const rule = FOLDER_FORMAT_RULES[key];
  if (!rule) return ["pdf", "jpg", "jpeg", "png", "gif", "webp"];
  return rule.exts;
}

export function getFolderHint(slug: string): string {
  const key = (slug || "").toLowerCase();
  return FOLDER_FORMAT_RULES[key]?.hint ?? "PDF, 이미지 파일";
}

export function isFileAllowed(file: { name: string; type?: string }, slug: string): boolean {
  const key = (slug || "").toLowerCase();
  if (ALL_FORMAT_SLUGS.includes(key)) return true;
  const exts = getAllowedExts(key);
  if (exts.includes("*")) return true;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return exts.some((e) => e.toLowerCase() === ext);
}
