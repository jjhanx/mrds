/**
 * 동영상을 H.264 MP4로 변환 (iPhone MOV/HEVC → PC 호환)
 * ffmpeg가 서버에 설치되어 있어야 함.
 */

import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function transcodeToH264(
  inputBuffer: Buffer,
  mimeType: string
): Promise<Buffer | null> {
  const isVideo = mimeType.startsWith("video/");
  if (!isVideo) return null;

  const ext = mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1] || "mp4";
  const inputPath = join(tmpdir(), `mrds-video-in-${Date.now()}.${ext}`);
  const outputPath = join(tmpdir(), `mrds-video-out-${Date.now()}.mp4`);

  try {
    await writeFile(inputPath, inputBuffer);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        [
          "-i",
          inputPath,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      let stderr = "";
      proc.stderr?.on("data", (d) => (stderr += d.toString()));
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
      });
      proc.on("error", (e) => reject(e));
    });

    const { readFile } = await import("fs/promises");
    const result = await readFile(outputPath);
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    return result;
  } catch (e) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    console.warn("Video transcode failed (ffmpeg may be missing):", e);
    return null;
  }
}
