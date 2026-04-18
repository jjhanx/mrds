import type { Note, OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const PLAYBACK_RED = "#d62828";

type Snapshot = { note: Note; head: string; stem: string };

let stack: Snapshot[] = [];

/** 이전 강조 색 복원 후 렌더 */
export function clearPlaybackNoteHighlight(osmd: OpenSheetMusicDisplay | null): void {
  for (const s of stack) {
    s.note.NoteheadColor = s.head;
    s.note.ParentVoiceEntry.StemColor = s.stem;
  }
  stack = [];
  if (osmd) osmd.render();
}

/** 현재 재생 음표만 빨간색(머리·줄기). 직전 스텝 색은 복원 */
export function setPlaybackNoteHighlight(osmd: OpenSheetMusicDisplay, notes: Note[]): void {
  for (const s of stack) {
    s.note.NoteheadColor = s.head;
    s.note.ParentVoiceEntry.StemColor = s.stem;
  }
  stack = [];
  for (const n of notes) {
    if (n.isRest()) continue;
    stack.push({
      note: n,
      head: n.NoteheadColor,
      stem: n.ParentVoiceEntry.StemColor,
    });
    n.NoteheadColor = PLAYBACK_RED;
    n.ParentVoiceEntry.StemColor = PLAYBACK_RED;
  }
  osmd.render();
}
