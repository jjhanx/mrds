import type { Note, OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const PLAYBACK_RED = "#d62828";

/** 줄기(Stem)는 화음에서 VoiceEntry를 공유하므로 건드리면 색 복원이 꼬여 잔상이 남음 → 머리만 강조 */
type Snapshot = { note: Note; head: string };

let stack: Snapshot[] = [];

/** 이전 강조 색 복원 후 렌더 */
export function clearPlaybackNoteHighlight(osmd: OpenSheetMusicDisplay | null): void {
  for (const s of stack) {
    s.note.NoteheadColor = s.head;
  }
  stack = [];
  /** render()는 스크롤을 맨 위로 되돌림 — 뷰포트 위치 유지는 renderAndScrollBack */
  if (osmd) osmd.renderAndScrollBack();
}

/** 현재 재생 음표 머리만 빨간색. 직전 스텝 색은 복원 */
export function setPlaybackNoteHighlight(osmd: OpenSheetMusicDisplay, notes: Note[]): void {
  for (const s of stack) {
    s.note.NoteheadColor = s.head;
  }
  stack = [];
  for (const n of notes) {
    if (n.isRest()) continue;
    stack.push({
      note: n,
      head: n.NoteheadColor,
    });
    n.NoteheadColor = PLAYBACK_RED;
  }
  osmd.renderAndScrollBack();
}
