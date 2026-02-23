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

export function getAllowedExts(slug: string): readonly string[] {
  const rule = FOLDER_FORMAT_RULES[slug];
  if (!rule) return ["pdf", "jpg", "jpeg", "png", "gif", "webp"];
  return rule.exts;
}

export function getFolderHint(slug: string): string {
  return FOLDER_FORMAT_RULES[slug]?.hint ?? "PDF, 이미지 파일";
}

export function isFileAllowed(file: { name: string; type?: string }, slug: string): boolean {
  const exts = getAllowedExts(slug);
  if (exts.includes("*")) return true;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return exts.some((e) => e.toLowerCase() === ext);
}
