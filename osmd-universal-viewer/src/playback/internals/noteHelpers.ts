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

/** OSMD `PlaybackSettings.getDurationInMilliseconds` + tie 규칙 → 초 */
export function getNoteDurationSeconds(note: Note, ps: { getDurationInMilliseconds(d: unknown): number }) {
  let ms = ps.getDurationInMilliseconds(note.Length);
  if (note.NoteTie) {
    if (Object.is(note.NoteTie.StartNote, note) && note.NoteTie.Notes[1]) {
      ms += ps.getDurationInMilliseconds(note.NoteTie.Notes[1].Length);
    } else {
      return 0;
    }
  }
  return ms / 1000;
}

export function getNoteVolume(note: Note) {
  return note.ParentVoiceEntry.ParentVoice.Volume;
}
