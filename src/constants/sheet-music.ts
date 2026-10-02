/** 합창곡/애창곡 slug — 이 폴더는 악보(PDF/이미지) + NWC + 동영상 첨부 가능 (클라이언트/서버 공용) */
export const SCORE_FOLDER_SLUGS: readonly string[] = ["choir", "art-song"];

export interface FormatPreset {
  id: string;
  label: string;
  exts: string[];
  hint: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: "all",
    label: "모든 파일 형식 (제한 없음)",
    exts: ["*"],
    hint: "모든 파일 형식",
  },
  {
    id: "mxl",
    label: "MusicXML / MXL 악보 (.mxl, .musicxml, .xml)",
    exts: ["mxl", "musicxml", "xml"],
    hint: "MXL, MusicXML 파일 (.mxl, .musicxml, .xml)",
  },
  {
    id: "score",
    label: "PDF 및 이미지 악보 (.pdf, .jpg, .png 등)",
    exts: ["pdf", "jpg", "jpeg", "png", "gif", "webp"],
    hint: "PDF, 이미지 파일 (.pdf, .jpg, .png 등)",
  },
  {
    id: "nwc",
    label: "NWC 악보 (.nwc)",
    exts: ["nwc"],
    hint: "NWC 파일 (.nwc)",
  },
  {
    id: "video",
    label: "동영상 (.mp4, .webm 등)",
    exts: ["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "wmv"],
    hint: "동영상 (MP4, WebM 등)",
  },
  {
    id: "audio",
    label: "음원 / 오디오 (.mp3, .wav 등)",
    exts: ["mp3", "wav", "m4a", "aac", "ogg", "flac", "wma"],
    hint: "오디오 파일 (MP3, WAV, M4A 등)",
  },
];

/** 폴더별 기본 허용 파일 확장자. "*" = 모든 포맷 허용 */
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
  mxl: {
    exts: ["mxl", "musicxml", "xml"],
    hint: "MXL, MusicXML 파일 (.mxl, .musicxml, .xml)",
  },
  musicxml: {
    exts: ["mxl", "musicxml", "xml"],
    hint: "MusicXML, MXL 파일 (.musicxml, .mxl, .xml)",
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
  mxl: MAX_2GB,
  musicxml: MAX_2GB,
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

export function getAllowedExts(slug: string, folderAllowedExts?: string | null): readonly string[] {
  // 1. 폴더 속성에 직접 지정된 허용 확장자가 있는 경우
  if (folderAllowedExts && folderAllowedExts.trim()) {
    const trimmed = folderAllowedExts.trim();
    if (trimmed === "*") return ["*"];
    return trimmed
      .split(",")
      .map((e) => e.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);
  }

  const key = (slug || "").toLowerCase();
  const rule = FOLDER_FORMAT_RULES[key];
  if (rule) return rule.exts;

  // 2. slug에 mxl 또는 musicxml이 포함되어 있는 경우
  if (key.includes("mxl") || key.includes("musicxml")) {
    return ["mxl", "musicxml", "xml"];
  }

  // 3. 별도 규칙이 없는 신규/사용자 폴더는 기본적으로 형식 제한 없음(*) 허용!
  return ["*"];
}

export function getFolderHint(slug: string, folderAllowedExts?: string | null): string {
  if (folderAllowedExts && folderAllowedExts.trim()) {
    const trimmed = folderAllowedExts.trim();
    if (trimmed === "*") return "모든 파일 형식";
    const list = trimmed
      .split(",")
      .map((e) => e.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);
    return `${list.map((e) => "." + e).join(", ")} 파일`;
  }

  const key = (slug || "").toLowerCase();
  const rule = FOLDER_FORMAT_RULES[key];
  if (rule) return rule.hint;

  if (key.includes("mxl") || key.includes("musicxml")) {
    return "MXL, MusicXML 파일 (.mxl, .musicxml, .xml)";
  }

  // 기본적으로 모든 파일 형식 허용 안내
  return "모든 파일 형식";
}

export function isFileAllowed(
  file: { name: string; type?: string },
  slug: string,
  folderAllowedExts?: string | null
): boolean {
  const key = (slug || "").toLowerCase();
  if (ALL_FORMAT_SLUGS.includes(key)) return true;

  const exts = getAllowedExts(key, folderAllowedExts);
  if (exts.includes("*")) return true;

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return exts.some((e) => e.toLowerCase() === ext);
}

const SPOTLIGHT_SUFFIX = "악보 자료실에서 확인하세요.";

/** 홈 등 설명이 비었을 때 filepath 확장자별 기본 안내 문구 */
export function getDefaultSheetMusicSpotlightDescription(filepath: string): string {
  const pathOnly = filepath.split("?")[0];
  const ext = (pathOnly.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();

  if (["mxl", "musicxml", "xml"].includes(ext)) {
    return `새로 등록된 MusicXML / MXL 악보입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac", "opus", "wma", "aiff", "alac", "oga"].includes(ext)) {
    return `새로 등록된 오디오 파일입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "wmv"].includes(ext)) {
    return `새로 등록된 동영상 파일입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return `새로 등록된 이미지 파일입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (ext === "pdf") {
    return `새로 등록된 PDF 악보입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (ext === "nwc") {
    return `새로 등록된 NWC 악보입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
    return `새로 등록된 압축 파일입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  if (["doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "hwp"].includes(ext)) {
    return `새로 등록된 문서 파일입니다. ${SPOTLIGHT_SUFFIX}`;
  }
  return `새로 등록된 악보입니다. ${SPOTLIGHT_SUFFIX}`;
}
