# OSMD Universal Viewer

별도 프로젝트로, **MusicXML / MXL** 과 **NWC**(내부적으로 MusicXML로 변환)를 [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay)로 표시하고, 재생은 [jimutt/osmd-audio-player](https://github.com/jimutt/osmd-audio-player) 패턴(`soundfont-player` + OSMD 커서)을 사용합니다.

## 요구 사항

- Node 18+

## 사용법

```bash
cd osmd-universal-viewer
npm install
npm run dev
```

브라우저에서 `http://localhost:5174` — `.xml`, `.musicxml`, `.mxl`, `.nwc` 파일을 열거나 드래그합니다.

## 빌드

```bash
npm run build
npm run preview
```

## NWC 변환

`src/nwc2xml-lib/` 는 mrds `public/nwc-viewer/lib/nwc2xml` 복사본이며, **브라우저 번들**을 위해 `parser.js`의 Node 전용 `zlib` / top-level `await` 를 제거하고 [pako](https://github.com/nodeca/pako)로 NWZ 압축 해제를 합니다.

## 라이선스

- OSMD: BSD-3-Clause  
- osmd-audio-player 벤더 코드: MIT (저장소 원본과 동일)  
- nwc2xml: 원본 mrds/nwc-viewer 라이선스 따름  
