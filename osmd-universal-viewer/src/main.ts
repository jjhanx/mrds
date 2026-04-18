import "./styles.css";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import PlaybackEngine, { PlaybackEvent, PlaybackState } from "./playback/PlaybackEngine";
import { nwcBufferToMusicXml } from "./nwc/convertNwcToMusicXml";

const EXT_XML = /\.(xml|musicxml)$/i;
const EXT_MXL = /\.mxl$/i;
const EXT_NWC = /\.nwc$/i;

function template(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

const root = document.querySelector("#app")!;

root.appendChild(
  template(`
  <div>
    <h1 style="font-size:1.15rem;font-weight:600;margin:0 0 1rem;">OSMD 뷰어 — MusicXML / MXL / NWC</h1>
    <p class="hint">NWC는 MusicXML로 변환 후 표시합니다. 재생은 soundfont-player(GM)와 OSMD 커서 동기화를 사용합니다 (jimutt/osmd-audio-player 기반).</p>
    <div class="drop" id="drop">파일을 여기에 놓거나 아래에서 선택하세요 (.xml · .musicxml · .mxl · .nwc)</div>
    <div class="toolbar">
      <label class="file-btn"><input type="file" id="file" accept=".xml,.musicxml,.mxl,.nwc,application/vnd.recordare.musicxml+xml,application/octet-stream" /> 파일 열기</label>
      <button type="button" id="play" disabled>재생</button>
      <button type="button" id="pause" disabled>일시정지</button>
      <button type="button" id="stop" disabled>정지</button>
      <div class="zoom">
        <span>확대</span>
        <input type="range" id="zoom" min="0.4" max="1.6" step="0.05" value="1" disabled />
        <span id="zoomLabel">100%</span>
      </div>
      <div class="status" id="status">파일을 선택하세요.</div>
    </div>
    <div class="score-wrap" id="scoreOuter"><div id="score"></div></div>
  </div>
`)
);

const scoreContainer = document.getElementById("score")!;
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

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function setTransport(enabled: boolean) {
  playBtn.disabled = !enabled;
  pauseBtn.disabled = !enabled;
  stopBtn.disabled = !enabled;
  zoomRange.disabled = !enabled;
}

function syncPlayPauseButtons(state: PlaybackState) {
  const playing = state === PlaybackState.PLAYING;
  playBtn.disabled = !engine?.ready || playing;
  pauseBtn.disabled = !engine?.ready || !playing;
}

function disposeEngine() {
  if (engine) {
    void engine.stop().catch(() => {});
    engine = null;
  }
}

async function loadIntoOsmd(content: string | Blob, title: string) {
  disposeEngine();
  if (osmd) {
    osmd.clear();
  } else {
    osmd = new OpenSheetMusicDisplay(scoreContainer, {
      autoResize: true,
      backend: "svg",
      drawingParameters: "compact",
    });
  }

  setStatus("악보를 불러오는 중…");
  await osmd.load(content, title);
  osmd.setOptions({ autoResize: true });
  osmd.zoom = Number(zoomRange.value);
  osmd.render();
  osmd.enableOrDisableCursors(true);
  osmd.cursor?.reset();
  osmd.cursor?.hide();

  engine = new PlaybackEngine();
  engine.on(PlaybackEvent.STATE_CHANGE, (s: PlaybackState) => {
    syncPlayPauseButtons(s);
  });

  try {
    await engine.loadScore(osmd);
  } catch (e) {
    console.error(e);
    setStatus(`재생 엔진 초기화 실패: ${e instanceof Error ? e.message : String(e)}`);
    setTransport(false);
    return;
  }

  setTransport(true);
  syncPlayPauseButtons(PlaybackState.STOPPED);
  setStatus(`${title} — 준비됨 (재생 클릭 시 오디오 시작)`);
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

playBtn.addEventListener("click", () => {
  if (!engine?.ready) return;
  void engine.play();
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
  }
});
