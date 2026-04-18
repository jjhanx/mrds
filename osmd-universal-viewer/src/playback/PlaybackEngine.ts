// @ts-nocheck — OSMD 1.9 + soundfont; 타임라인은 OSMD 위키/iterator 기준 (jimutt tick 큐 대체)
import { Cursor, OpenSheetMusicDisplay, MusicSheet, Note, Instrument, Voice } from "opensheetmusicdisplay";
import { SoundfontPlayer } from "./players/SoundfontPlayer";
import { InstrumentPlayer, PlaybackInstrument } from "./players/InstrumentPlayer";
import { NotePlaybackInstruction } from "./players/NotePlaybackOptions";
import { getNoteVolume, getNoteArticulationStyle, getNoteDurationSeconds } from "./internals/noteHelpers";
import { EventEmitter } from "./internals/EventEmitter";
import { AudioContext, IAudioContext } from "standardized-audio-context";

export enum PlaybackState {
  INIT = "INIT",
  PLAYING = "PLAYING",
  STOPPED = "STOPPED",
  PAUSED = "PAUSED",
}

export enum PlaybackEvent {
  STATE_CHANGE = "state-change",
  ITERATION = "iteration",
}

interface PlaybackSettingsBag {
  bpm: number;
  masterVolume: number;
}

/** iterator 한 스텝(세로 슬라이스) — OSMD 위키: time = enrolled.RealValue * 4 * 60 / BPM (초) */
interface TimelineStep {
  startSec: number;
  notes: Note[];
  /** 빌드 시점 iterator.currentPlaybackSettings()로 계산한 초(참조 공유 방지) */
  durationByNote: Map<Note, number>;
}

function midiProgramForNote(note: Note): number {
  const pv = note.ParentVoiceEntry?.ParentVoice as any;
  if (!pv) return 0;
  const fromVoice = Number(pv.midiInstrumentId);
  if (Number.isFinite(fromVoice)) return fromVoice;
  const inst = pv.Parent;
  if (inst != null && Number.isFinite(Number(inst.MidiInstrumentId))) {
    return Number(inst.MidiInstrumentId);
  }
  return 0;
}

export default class PlaybackEngine {
  private ac: IAudioContext;
  private defaultBpm: number = 100;
  private cursor: Cursor;
  private sheet: MusicSheet;
  private instrumentPlayer: InstrumentPlayer;
  private events: EventEmitter<PlaybackEvent>;

  private iterationSteps: number;
  private currentIterationStep: number;

  private timeoutHandles: number[];
  private playbackRafHandle: number | null = null;
  private playbackTailHandle: ReturnType<typeof setTimeout> | null = null;

  /** loadScore 시 빌드; 재생은 Web Audio 절대 시각 + rAF 하이라이트 */
  private timeline: TimelineStep[] = [];

  /** 재생 루프: scoreAt = scoreOffsetSec + (ac.currentTime - playbackT0) */
  private playbackT0 = 0;
  private scoreOffsetSec = 0;
  private highlightLoopIndex = 0;

  public playbackSettings: PlaybackSettingsBag;
  public state: PlaybackState;
  public availableInstruments: PlaybackInstrument[];
  public scoreInstruments: Instrument[] = [];
  public ready: boolean = false;
  /** 설정 시 해당 Staff(전역 인덱스)만 재생. undefined 또는 빈 배열이면 전체. */
  public selectedStaffIndices: number[] | undefined = undefined;

  constructor(context: IAudioContext = new AudioContext(), instrumentPlayer: InstrumentPlayer = new SoundfontPlayer()) {
    this.ac = context;
    this.ac.suspend();

    this.instrumentPlayer = instrumentPlayer;
    this.instrumentPlayer.init(this.ac);

    this.availableInstruments = this.instrumentPlayer.instruments;

    this.events = new EventEmitter();

    this.cursor = null;
    this.sheet = null;

    this.iterationSteps = 0;
    this.currentIterationStep = 0;

    this.timeoutHandles = [];

    this.playbackSettings = {
      bpm: this.defaultBpm,
      masterVolume: 1,
    };

    this.setState(PlaybackState.INIT);
  }

  get wholeNoteLength(): number {
    return Math.round((60 / this.playbackSettings.bpm) * 4000);
  }

  get totalSteps() {
    return this.iterationSteps;
  }

  setStaffFilter(indices: number[] | undefined) {
    this.selectedStaffIndices = indices?.length ? [...indices] : undefined;
  }

  public getPlaybackInstrument(voiceId: number): PlaybackInstrument {
    if (!this.sheet) return null;
    const voice = this.sheet.Instruments.flatMap(i => i.Voices).find(v => v.VoiceId === voiceId);
    return this.availableInstruments.find(i => i.midiId === (voice as any).midiInstrumentId);
  }

  public async setInstrument(voice: Voice, midiInstrumentId: number): Promise<void> {
    await this.instrumentPlayer.load(midiInstrumentId);
    (voice as any).midiInstrumentId = midiInstrumentId;
  }

  /** MusicXML 파트(Instrument) 인덱스별 GM 프로그램 번호(0–127) 변경 */
  async setPartInstrument(partIndex: number, midiProgram: number): Promise<void> {
    if (!this.sheet?.Instruments?.[partIndex]) return;
    const id = Number(midiProgram);
    await this.instrumentPlayer.load(id);
    const inst = this.sheet.Instruments[partIndex];
    inst.MidiInstrumentId = id;
    for (const v of inst.Voices) {
      (v as any).midiInstrumentId = id;
    }
  }

  async loadScore(osmd: OpenSheetMusicDisplay): Promise<void> {
    this.ready = false;
    this.clearPlaybackAnim();
    this.timeline = [];
    this.sheet = osmd.Sheet;
    this.scoreInstruments = this.sheet.Instruments;
    this.cursor = osmd.cursor;
    if (this.sheet.HasBPMInfo) {
      this.setBpm(this.sheet.DefaultStartTempoInBpm);
    }

    await this.loadInstruments();
    this.initInstruments();

    this.buildTimeline();
    this.ready = true;
    this.setState(PlaybackState.STOPPED);
  }

  /** iterator를 한 번 훑어 OSMD 타임스탬프(초) + 음표 목록 저장 */
  private buildTimeline() {
    this.cursor.reset();
    const it = this.cursor.Iterator;
    const timeline: TimelineStep[] = [];
    let guard = 0;
    const MAX = 8_000_000;
    /** OSMD 위키: iterator.currentTimeStamp 기준(마디 단위 enrolled와 다를 수 있음) */
    let lastStartSec = 0;
    while (!it.EndReached) {
      if (++guard > MAX) throw new Error("Timeline build: too many iterator steps");
      const bpm = it.CurrentBpm || it.CurrentMeasure?.TempoInBPM || this.playbackSettings.bpm || 120;
      const ts = it.currentTimeStamp;
      let startSec = ts.RealValue * 4 * (60 / bpm);
      if (!Number.isFinite(startSec)) startSec = lastStartSec;
      if (startSec < lastStartSec) startSec = lastStartSec;
      lastStartSec = startSec;
      const ps = it.currentPlaybackSettings();
      const notes: Note[] = [];
      const durationByNote = new Map<Note, number>();
      for (const ve of it.CurrentVoiceEntries) {
        if (ve.IsGrace) continue;
        for (const n of ve.Notes) {
          notes.push(n);
          durationByNote.set(n, getNoteDurationSeconds(n, ps, bpm));
        }
      }
      timeline.push({ startSec, notes, durationByNote });
      this.cursor.next();
    }
    this.timeline = timeline;
    this.iterationSteps = timeline.length;
    this.cursor.reset();
    if (this.iterationSteps === 0 && this.sheet?.SourceMeasures?.length > 0) {
      console.error("[PlaybackEngine] 타임라인 스텝이 0인데 악보에 마디가 있습니다. 커서/iterator 상태를 확인하세요.");
    }
  }

  private initInstruments() {
    for (const i of this.sheet.Instruments) {
      const pid = Number(i.MidiInstrumentId);
      for (const v of i.Voices) {
        (v as any).midiInstrumentId = Number.isFinite(pid) ? pid : 0;
      }
    }
  }

  private async loadInstruments() {
    let playerPromises: Promise<void>[] = [];
    for (const i of this.sheet.Instruments) {
      const pbInstrument = this.availableInstruments.find(pbi => pbi.midiId === i.MidiInstrumentId);
      if (pbInstrument == null) {
        this.fallbackToPiano(i);
      }
      playerPromises.push(this.instrumentPlayer.load(i.MidiInstrumentId));
    }
    await Promise.all(playerPromises);
  }

  private fallbackToPiano(i: Instrument) {
    console.warn(`Can't find playback instrument for midiInstrumentId ${i.MidiInstrumentId}. Falling back to piano`);
    i.MidiInstrumentId = 0;

    if (this.availableInstruments.find(i => i.midiId === 0) == null) {
      throw new Error("Piano fallback failed, grand piano not supported");
    }
  }

  async play() {
    await this.ac.resume();

    if (this.state === PlaybackState.INIT || this.state === PlaybackState.STOPPED) {
      this.cursor.show();
    }

    this.clearTimeoutsOnly();
    this.clearPlaybackAnim();
    this.setState(PlaybackState.PLAYING);
    this.schedulePlaybackRun();
  }

  async stop() {
    this.setState(PlaybackState.STOPPED);
    this.stopPlayers();
    this.clearTimeoutsOnly();
    this.clearPlaybackAnim();
    this.cursor.reset();
    this.currentIterationStep = 0;
    this.cursor.hide();
  }

  pause() {
    this.setState(PlaybackState.PAUSED);
    this.ac.suspend();
    this.stopPlayers();
    this.clearTimeoutsOnly();
    this.clearPlaybackAnim();
  }

  jumpToStep(step: number) {
    if (this.state === PlaybackState.PLAYING) {
      this.pause();
    }
    if (this.currentIterationStep > step) {
      this.cursor.reset();
      this.currentIterationStep = 0;
    }
    while (this.currentIterationStep < step) {
      this.cursor.next();
      ++this.currentIterationStep;
    }
  }

  setBpm(bpm: number) {
    this.playbackSettings.bpm = bpm;
    /** 악보 로드 후 타임라인은 시트 BPM 기준; UI BPM은 향후 배속용 예약 */
  }

  public on(event: PlaybackEvent, cb: (...args: any[]) => void) {
    this.events.on(event, cb);
  }

  /** 남은 구간 오디오 스케줄 + rAF로 하이라이트/커서 */
  private schedulePlaybackRun() {
    const startIdx = this.currentIterationStep;
    if (startIdx >= this.iterationSteps || this.iterationSteps === 0) {
      this.endPlaybackNaturally();
      return;
    }

    const scoreOffset = this.timeline[startIdx].startSec;
    const audioT0 = this.ac.currentTime;

    for (let i = startIdx; i < this.iterationSteps; i++) {
      const when = Math.max(audioT0, audioT0 + (this.timeline[i].startSec - scoreOffset));
      this.scheduleStepAudio(i, when);
    }

    this.playbackT0 = audioT0;
    this.scoreOffsetSec = scoreOffset;
    this.highlightLoopIndex = startIdx;

    const EPS = 0.002;
    const tick = () => {
      if (this.state !== PlaybackState.PLAYING) return;
      const elapsed = this.ac.currentTime - this.playbackT0;
      const scoreAt = this.scoreOffsetSec + elapsed;
      while (this.highlightLoopIndex < this.iterationSteps && this.timeline[this.highlightLoopIndex].startSec <= scoreAt + EPS) {
        this.emitHighlightAndCursor(this.highlightLoopIndex++);
      }
      if (this.highlightLoopIndex >= this.iterationSteps) {
        const tailMs = this.getTailAfterLastEventSeconds() * 1000;
        this.playbackTailHandle = window.setTimeout(() => this.endPlaybackNaturally(), Math.max(0, tailMs));
        return;
      }
      this.playbackRafHandle = requestAnimationFrame(tick);
    };
    this.playbackRafHandle = requestAnimationFrame(tick);
  }

  private getTailAfterLastEventSeconds(): number {
    for (let i = this.iterationSteps - 1; i >= 0; i--) {
      const step = this.timeline[i];
      let max = 0;
      for (const n of step.notes) {
        if (n.isRest()) continue;
        const staffIdx = MusicSheet.getIndexFromStaff(n.ParentStaff);
        if (this.selectedStaffIndices && this.selectedStaffIndices.indexOf(staffIdx) < 0) continue;
        max = Math.max(max, step.durationByNote.get(n) ?? 0);
      }
      if (max > 0) return max;
    }
    return 0;
  }

  private scheduleStepAudio(stepIndex: number, when: number) {
    const step = this.timeline[stepIndex];
    const scheduledNotes: Map<number, NotePlaybackInstruction[]> = new Map();

    for (const note of step.notes) {
      if (note.isRest()) continue;
      const staffIdx = MusicSheet.getIndexFromStaff(note.ParentStaff);
      if (this.selectedStaffIndices && this.selectedStaffIndices.indexOf(staffIdx) < 0) {
        continue;
      }
      const durSec = step.durationByNote.get(note) ?? 0;
      if (durSec === 0) continue;

      const noteVolume = getNoteVolume(note);
      const noteArticulation = getNoteArticulationStyle(note);
      const midiPlaybackInstrument = midiProgramForNote(note);
      const sub = note.ParentVoiceEntry.ParentVoice.Parent?.SubInstruments?.[0];
      const fixedKey = sub?.fixedKey ?? 0;
      const midiPitch = Math.max(0, Math.min(127, Math.round(note.halfTone - fixedKey * 12)));

      if (!scheduledNotes.has(midiPlaybackInstrument)) {
        scheduledNotes.set(midiPlaybackInstrument, []);
      }

      scheduledNotes.get(midiPlaybackInstrument).push({
        note: midiPitch,
        duration: durSec,
        gain: noteVolume,
        articulation: noteArticulation,
      });
    }

    for (const [midiId, instructions] of scheduledNotes) {
      try {
        this.instrumentPlayer.schedule(midiId, when, instructions);
      } catch (e) {
        console.warn("[PlaybackEngine] schedule failed:", midiId, e);
      }
    }
  }

  private emitHighlightAndCursor(stepIndex: number) {
    const step = this.timeline[stepIndex];
    const audibleNotes: Note[] = [];
    for (const note of step.notes) {
      if (note.isRest()) continue;
      const staffIdx = MusicSheet.getIndexFromStaff(note.ParentStaff);
      if (this.selectedStaffIndices && this.selectedStaffIndices.indexOf(staffIdx) < 0) continue;
      if ((step.durationByNote.get(note) ?? 0) === 0) continue;
      audibleNotes.push(note);
    }
    this.events.emit(PlaybackEvent.ITERATION, audibleNotes);
    this.currentIterationStep = stepIndex + 1;
    try {
      this.cursor.next();
    } catch {
      /* ignore */
    }
  }

  private endPlaybackNaturally() {
    this.clearPlaybackAnim();
    this.setState(PlaybackState.STOPPED);
    this.stopPlayers();
    this.currentIterationStep = this.iterationSteps;
    try {
      this.cursor?.hide();
    } catch {
      /* ignore */
    }
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.events.emit(PlaybackEvent.STATE_CHANGE, state);
  }

  private stopPlayers() {
    const ids = new Set();
    for (const i of this.sheet.Instruments) {
      for (const v of i.Voices) {
        const id = (v as any).midiInstrumentId;
        if (id != null && id !== undefined) ids.add(Number(id));
      }
    }
    for (const id of ids) {
      this.instrumentPlayer.stop(id);
    }
  }

  private clearTimeoutsOnly() {
    for (let h of this.timeoutHandles) {
      clearTimeout(h);
    }
    this.timeoutHandles = [];
  }

  private clearPlaybackAnim() {
    if (this.playbackRafHandle != null) {
      cancelAnimationFrame(this.playbackRafHandle);
      this.playbackRafHandle = null;
    }
    if (this.playbackTailHandle != null) {
      clearTimeout(this.playbackTailHandle);
      this.playbackTailHandle = null;
    }
  }

  // Used to avoid duplicate cursor movements after a rapid pause/resume action
  private clearTimeouts() {
    this.clearTimeoutsOnly();
    this.clearPlaybackAnim();
  }
}
