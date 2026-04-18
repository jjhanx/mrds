import "./styles.css";
import { OpenSheetMusicDisplay, MusicSheet, Note } from "opensheetmusicdisplay";
import PlaybackEngine, { PlaybackEvent, PlaybackState } from "./playback/PlaybackEngine";
import { nwcBufferToMusicXml } from "./nwc/convertNwcToMusicXml";
import { midiInstruments } from "./playback/midi/midiInstruments";
import { clearPlaybackNoteHighlight, setPlaybackNoteHighlight } from "./playbackHighlight";

const EXT_XML = /\.(xml|musicxml)$/i;
const EXT_MXL = /\.mxl$/i;
const EXT_NWC = /\.nwc$/i;

/** nwc-viewer PLAYHEAD_PX 와 유사: 스크롤 기준 재생 시작 가상선 */
const PLAYHEAD_PX = 60;
const SCROLL_SEEK_DEBOUNCE_MS = 180;

function template(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

const root = document.querySelector("#app")!;

root.appendChild(
  template(`
  <div>
    <h1 style="font-size:1.15rem;font-weight:600;margin:0 0 0.75rem;">OSMD 뷰어 — MusicXML / MXL / NWC</h1>
    <p class="hint">NWC는 MusicXML로 변환 후 표시합니다. 파트별 GM 악기를 고를 수 있고, 재생 중 해당 순간의 음표가 빨간색으로 표시됩니다. 정지·스크롤 시 강조는 해제됩니다.</p>
    <div class="drop" id="drop">파일을 여기에 놓거나 아래에서 선택하세요 (.xml · .musicxml · .mxl · .nwc)</div>
    <div class="toolbar">
      <label class="file-btn"><input type="file" id="file" accept=".xml,.musicxml,.mxl,.nwc,application/vnd.recordare.musicxml+xml,application/octet-stream" /> 파일 열기</label>
      <button type="button" id="play" disabled>재생</button>
      <button type="button" id="pause" disabled>일시정지</button>
      <button type="button" id="stop" disabled>정지</button>
      <div class="zoom">
        <span>확대</span>
        <input type="range" id="zoom" min="0.35" max="1.2" step="0.05" value="0.5" disabled />
        <span id="zoomLabel">50%</span>
      </div>
      <div class="status" id="status">파일을 선택하세요.</div>
    </div>
    <div id="staffBar" class="staff-bar" style="display:none"></div>
    <div id="gmBar" class="gm-bar" style="display:none"></div>
    <div class="score-wrap" id="scoreOuter"><div id="score"></div></div>
  </div>
`)
);

const scoreContainer = document.getElementById("score")!;
const scoreOuter = document.getElementById("scoreOuter")!;
const staffBar = document.getElementById("staffBar")!;
const gmBar = document.getElementById("gmBar")!;
const statusEl = document.getElementById("status")!;
const dropEl = document.getElementById("drop")!;
const fileInput = document.getElementById("file") as HTMLInputElement;
const playBtn = document.getElementById("play") as HTMLButtonElement;
const pauseBtn = document.getElementById("pause") as HTMLButtonElement;
const stopBtn = document.getElementById("stop") as HTMLButtonElement;
const zoomRange = document.getElementById("zoom") as HTMLInputElement;
const zoomLabel = document.getElementById("zoomLabel")!;

let osmd: OpenSheetMusicDisplay | null = null;
let engine: PlaybackEngine | null = null;
/** undefined = 전체 재생 */
let selectedStaffIndices: number[] | undefined = undefined;
let scrollSeekTimer: ReturnType<typeof setTimeout> | null = null;

/** 한 프레임에 여러 ITERATION이 몰릴 때 render·색 복원 경쟁을 줄이기 위해 rAF로 합침 */
let highlightRafId: number | null = null;
const highlightNotesBuf: Note[] = [];

function flushPlaybackHighlight() {
  highlightRafId = null;
  if (!osmd) {
    highlightNotesBuf.length = 0;
    return;
  }
  const uniq: Note[] = [];
  const seen = new Set<Note>();
  for (const n of highlightNotesBuf) {
    if (n.isRest()) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    uniq.push(n);
  }
  highlightNotesBuf.length = 0;
  if (uniq.length === 0) {
    clearPlaybackNoteHighlight(osmd);
  } else {
    setPlaybackNoteHighlight(osmd, uniq);
  }
}

function queuePlaybackHighlight(notes: Note[]) {
  highlightNotesBuf.push(...notes);
  if (highlightRafId != null) return;
  highlightRafId = requestAnimationFrame(flushPlaybackHighlight);
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function setTransport(enabled: boolean) {
  playBtn.disabled = !enabled;
  pauseBtn.disabled = !enabled;
  stopBtn.disabled = !enabled;
  zoomRange.disabled = !enabled;
  setGmControlsEnabled(enabled && engine?.state !== PlaybackState.PLAYING);
}

function setGmControlsEnabled(on: boolean) {
  gmBar.querySelectorAll<HTMLSelectElement>(".gm-select").forEach((s) => {
    s.disabled = !on;
  });
}

function syncPlayPauseButtons(state: PlaybackState) {
  const playing = state === PlaybackState.PLAYING;
  playBtn.disabled = !engine?.ready || playing;
  pauseBtn.disabled = !engine?.ready || !playing;
}

function disposeEngine() {
  if (highlightRafId != null) {
    cancelAnimationFrame(highlightRafId);
    highlightRafId = null;
    highlightNotesBuf.length = 0;
  }
  clearPlaybackNoteHighlight(osmd);
  if (engine) {
    void engine.stop().catch(() => {});
    engine = null;
  }
}

function staffButtonLabel(sheet: MusicSheet, staffIdx: number): string {
  const staff = sheet.getStaffFromIndex(staffIdx);
  const ins = staff.ParentInstrument;
  const name = ins.Name || "파트";
  const firstGlob = sheet.getGlobalStaffIndexOfFirstStaff(ins);
  const subIdx = staffIdx - firstGlob;
  if (ins.Staves && ins.Staves.length > 1) {
    return `${name} (${subIdx + 1}/${ins.Staves.length})`;
  }
  return name;
}

function updateStaffBarHighlight() {
  staffBar.querySelectorAll<HTMLButtonElement>(".staff-btn").forEach((btn) => {
    const v = btn.dataset.staffIndex;
    if (v === "all") {
      btn.classList.toggle("selected", !selectedStaffIndices || selectedStaffIndices.length === 0);
    } else if (v != null) {
      const i = parseInt(v, 10);
      btn.classList.toggle("selected", !!selectedStaffIndices?.includes(i));
    }
  });
}

function rebuildStaffBar() {
  staffBar.innerHTML = "";
  selectedStaffIndices = undefined;
  if (!osmd?.Sheet) {
    staffBar.style.display = "none";
    return;
  }
  const sheet = osmd.Sheet;
  const n = sheet.getCompleteNumberOfStaves();
  if (n <= 1) {
    staffBar.style.display = "none";
    engine?.setStaffFilter(undefined);
    return;
  }

  staffBar.style.display = "flex";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "staff-btn selected";
  allBtn.dataset.staffIndex = "all";
  allBtn.textContent = "전체";
  allBtn.addEventListener("click", () => {
    selectedStaffIndices = undefined;
    engine?.setStaffFilter(undefined);
    updateStaffBarHighlight();
  });
  staffBar.appendChild(allBtn);

  for (let i = 0; i < n; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "staff-btn";
    btn.dataset.staffIndex = String(i);
    btn.textContent = staffButtonLabel(sheet, i);
    btn.addEventListener("click", () => {
      const cur = selectedStaffIndices;
      if (!cur || cur.length === 0) {
        selectedStaffIndices = [i];
      } else if (cur.includes(i)) {
        const next = cur.filter((x) => x !== i);
        selectedStaffIndices = next.length > 0 ? next : undefined;
      } else {
        selectedStaffIndices = [...cur, i].sort((a, b) => a - b);
      }
      engine?.setStaffFilter(selectedStaffIndices);
      updateStaffBarHighlight();
    });
    staffBar.appendChild(btn);
  }

  engine?.setStaffFilter(undefined);
  updateStaffBarHighlight();
}

function rebuildGmBar() {
  gmBar.innerHTML = "";
  if (!osmd?.Sheet || !engine) {
    gmBar.style.display = "none";
    return;
  }
  gmBar.style.display = "flex";
  const parts = osmd.Sheet.Instruments;
  parts.forEach((inst, pi) => {
    const row = document.createElement("div");
    row.className = "gm-row";
    const lab = document.createElement("span");
    lab.className = "gm-label";
    lab.textContent = `${inst.Name || `파트 ${pi + 1}`} · GM`;
    const sel = document.createElement("select");
    sel.className = "gm-select";
    for (const [id, name] of midiInstruments) {
      const o = document.createElement("option");
      o.value = String(id);
      o.textContent = `${id}: ${name}`;
      sel.appendChild(o);
    }
    const cur = Number(inst.MidiInstrumentId);
    sel.value = String(Number.isFinite(cur) ? cur : 0);
    sel.addEventListener("change", async () => {
      if (!engine) return;
      const v = parseInt(sel.value, 10);
      try {
        await engine.setPartInstrument(pi, v);
      } catch (e) {
        console.error(e);
        setStatus("악기(사운드폰트) 로드에 실패했습니다.");
      }
    });
    row.appendChild(lab);
    row.appendChild(sel);
    gmBar.appendChild(row);
  });
}

/** 스크롤 위치 → 재생 스텝 (선형 근사, OSMD 커서 스텝 수 기준) */
function scrollPositionToStep(): number {
  if (!engine?.ready) return 0;
  const steps = engine.totalSteps;
  if (steps <= 1) return 0;
  const maxScroll = Math.max(0, scoreOuter.scrollWidth - scoreOuter.clientWidth);
  if (maxScroll <= 0) return 0;
  const x = scoreOuter.scrollLeft + PLAYHEAD_PX;
  const ratio = Math.min(1, Math.max(0, x / (maxScroll + PLAYHEAD_PX)));
  return Math.min(steps - 1, Math.max(0, Math.round(ratio * (steps - 1))));
}

function applyScrollToCursor() {
  if (!engine?.ready || engine.state === PlaybackState.PLAYING) return;
  clearPlaybackNoteHighlight(osmd);
  engine.jumpToStep(scrollPositionToStep());
}

function scheduleScrollSeek() {
  if (scrollSeekTimer) clearTimeout(scrollSeekTimer);
  scrollSeekTimer = setTimeout(() => {
    scrollSeekTimer = null;
    applyScrollToCursor();
  }, SCROLL_SEEK_DEBOUNCE_MS);
}

async function loadIntoOsmd(content: string | Blob, title: string) {
  disposeEngine();
  selectedStaffIndices = undefined;
  scoreContainer.style.minWidth = "";

  if (!osmd) {
    osmd = new OpenSheetMusicDisplay(scoreContainer, {
      autoResize: true,
      backend: "svg",
      drawingParameters: "compact",
      renderSingleHorizontalStaffline: true,
      followCursor: true,
    });
  } else {
    osmd.clear();
  }

  osmd.setOptions({
    autoResize: true,
    backend: "svg",
    drawingParameters: "compact",
    renderSingleHorizontalStaffline: true,
    followCursor: true,
  });

  setStatus("악보를 불러오는 중…");
  await osmd.load(content, title);

  osmd.zoom = Number(zoomRange.value);
  osmd.setCustomPageFormat(4000, 1600);
  osmd.render();
  osmd.enableOrDisableCursors(true);
  osmd.cursor?.reset();
  osmd.cursor?.hide();

  requestAnimationFrame(() => {
    const inner = scoreContainer.querySelector(".osmd-container") as HTMLElement | null;
    const w = Math.max(inner?.scrollWidth ?? 0, scoreContainer.scrollWidth, 3600);
    scoreContainer.style.minWidth = `${Math.ceil(w + 64)}px`;
  });

  engine = new PlaybackEngine();
  engine.on(PlaybackEvent.STATE_CHANGE, (s: PlaybackState) => {
    syncPlayPauseButtons(s);
    if (s === PlaybackState.STOPPED) {
      if (highlightRafId != null) {
        cancelAnimationFrame(highlightRafId);
        highlightRafId = null;
        highlightNotesBuf.length = 0;
      }
      clearPlaybackNoteHighlight(osmd);
    }
    setGmControlsEnabled(!!engine?.ready && s !== PlaybackState.PLAYING);
  });

  engine.on(PlaybackEvent.ITERATION, (notes: Note[]) => {
    if (!osmd) return;
    queuePlaybackHighlight(notes);
  });

  try {
    await engine.loadScore(osmd);
  } catch (e) {
    console.error(e);
    setStatus(`재생 엔진 초기화 실패: ${e instanceof Error ? e.message : String(e)}`);
    setTransport(false);
    staffBar.style.display = "none";
    gmBar.style.display = "none";
    return;
  }

  rebuildStaffBar();
  rebuildGmBar();
  setTransport(true);
  syncPlayPauseButtons(PlaybackState.STOPPED);
  setStatus(`${title} — 스크롤로 시작 위치 조정 후 재생`);
}

async function handleFile(file: File) {
  const name = file.name;

  try {
    if (EXT_NWC.test(name)) {
      const buf = await file.arrayBuffer();
      const xml = nwcBufferToMusicXml(buf);
      await loadIntoOsmd(xml, name);
      return;
    }
    if (EXT_XML.test(name)) {
      const text = await file.text();
      await loadIntoOsmd(text, name);
      return;
    }
    if (EXT_MXL.test(name)) {
      await loadIntoOsmd(file, name);
      return;
    }
    setStatus("지원 형식: .xml, .musicxml, .mxl, .nwc");
  } catch (e) {
    console.error(e);
    setStatus(`오류: ${e instanceof Error ? e.message : String(e)}`);
    setTransport(false);
  }
}

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void handleFile(f);
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((ev) => {
  dropEl.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropEl.classList.add("drag");
  });
});

["dragleave", "drop"].forEach((ev) => {
  dropEl.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropEl.classList.remove("drag");
  });
});

dropEl.addEventListener("drop", (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f) void handleFile(f);
});

scoreOuter.addEventListener("scroll", () => {
  scheduleScrollSeek();
});

playBtn.addEventListener("click", async () => {
  if (!engine?.ready) return;
  if (engine.state === PlaybackState.PLAYING) return;
  if (engine.state === PlaybackState.STOPPED || engine.state === PlaybackState.INIT) {
    engine.jumpToStep(scrollPositionToStep());
  }
  await engine.play();
});

pauseBtn.addEventListener("click", () => {
  engine?.pause();
});

stopBtn.addEventListener("click", () => {
  void engine?.stop();
});

zoomRange.addEventListener("input", () => {
  const z = Number(zoomRange.value);
  zoomLabel.textContent = `${Math.round(z * 100)}%`;
  if (osmd) {
    osmd.zoom = z;
    osmd.render();
    requestAnimationFrame(() => {
      const inner = scoreContainer.querySelector(".osmd-container") as HTMLElement | null;
      const w = Math.max(inner?.scrollWidth ?? 0, scoreContainer.scrollWidth, 3600);
      scoreContainer.style.minWidth = `${Math.ceil(w + 64)}px`;
    });
  }
});
