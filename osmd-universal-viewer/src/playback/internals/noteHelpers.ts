// @ts-nocheck — vendored from jimutt/osmd-audio-player
import { Note } from "opensheetmusicdisplay";
import { ArticulationStyle } from "../players/NotePlaybackOptions";

export function getNoteArticulationStyle(note: Note): ArticulationStyle {
  if (note.ParentVoiceEntry.isStaccato()) {
    return ArticulationStyle.Staccato;
  } else {
    return ArticulationStyle.None;
  }
}

export function getNoteDuration(note: Note, wholeNoteLength) {
  let duration = note.Length.RealValue * wholeNoteLength;
  if (note.NoteTie) {
    if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.Notes[1]) {
      duration += note.NoteTie.Notes[1].Length.RealValue * wholeNoteLength;
    } else {
      duration = 0;
    }
  }
  return duration;
}

/** OSMD `PlaybackSettings.getDurationInMilliseconds` + tie 규칙 → 초. 0이면 위키식 길이로 대체 */
export function getNoteDurationSeconds(
  note: Note,
  ps: { getDurationInMilliseconds(d: unknown): number },
  bpmFallback: number
) {
  let ms = ps.getDurationInMilliseconds(note.Length);
  if (!Number.isFinite(ms) || ms <= 0) {
    ms = (note.Length.RealValue * 4 * (60 / bpmFallback)) * 1000;
  }
  if (note.NoteTie) {
    if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.Notes[1]) {
      let ms2 = ps.getDurationInMilliseconds(note.NoteTie.Notes[1].Length);
      if (!Number.isFinite(ms2) || ms2 <= 0) {
        ms2 = (note.NoteTie.Notes[1].Length.RealValue * 4 * (60 / bpmFallback)) * 1000;
      }
      ms += ms2;
    } else {
      return 0;
    }
  }
  return ms / 1000;
}

export function getNoteVolume(note: Note) {
  return note.ParentVoiceEntry.ParentVoice.Volume;
}
