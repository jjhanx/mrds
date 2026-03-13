# nwc-viewer 프로젝트 통합 가이드

NoteWorthy Composer(NWC) 파일을 웹에서 악보로 보고 소리로 들을 수 있게 하려면 [zz85/nwc-viewer](https://github.com/zz85/nwc-viewer)를 프로젝트에 통합하면 됩니다.

## 요약 (빠른 시작)

**✅ 이미 mrds에 통합됨** (2025년 기준)

1. `public/nwc-viewer/` — zz85/nwc-viewer gh-pages 복사본 (mrds 맞춤 수정)
2. `SheetMusicView` — NWC 메인 파일 시 iframe, NWC 첨부 시 "웹에서 악보 보기" 버튼
3. 사용: `/nwc-viewer/index.html?file=/uploads/sheet-music/nwc/xxx.nwc`

**mrds 맞춤 수정 사항:**
- `?file=` 파라미터로 URL 로드
- `?file=` 시 임베드 모드: Open nwc, 샘플 선택, NWC to MusicXML, Parser, Layout, Size, Footer 숨김
- 한글 가사: EUC-KR/CP949 인코딩, Google Fonts Noto Sans KR 로드, 한글 폰트 스택 적용
- 악보 레이아웃: pageWidth 최소 1000px로 마디당 한 줄 완화
- 임베드 시 기본 줌 25%: 한 줄에 4마디 이상 보이도록 스케일 축소
- 줌 범위: 25%~100% (임베드 권장 구간)
- 파트 선택: 여러 Voice 시 파트별 재생 선택 드롭다운, 선택된 Staff 파란색 표시
- 재생·악보 동기화: Tempo base 변환, 자동 스크롤, 재생 위치 빨간색 세로선 표시

**재통합 시** (예: nwc-viewer 업데이트):
1. `git clone -b gh-pages` → `public/nwc-viewer/`로 복사
2. `src/main.js` 기본 로드에 `?file=` 처리 추가 (섹션 4-2)
3. `.git` 폴더 제거

---

## 1. 개요

| 항목 | 설명 |
|------|------|
| 레포 | https://github.com/zz85/nwc-viewer |
| 데모 | https://zz85.github.io/nwc-viewer/ |
| 지원 NWC | v1.5, v1.7, v2.75 |
| 기능 | 악보 렌더링(Canvas/SMuFL), SoundFont 재생(OxiSynth WASM), NWC→MusicXML 변환 |
| 라이선스 | GNU |

---

## 2. 통합 방식 (3가지)

### 방식 A: public에 빌드 산출물 복사 (가장 단순)

nwc-viewer의 `gh-pages` 브랜치(이미 빌드된 버전)를 `public` 폴더에 복사합니다.

```bash
# 1. nwc-viewer clone
cd d:\mrds
git clone --depth 1 -b gh-pages https://github.com/zz85/nwc-viewer.git temp-nwc-viewer

# 2. 필요한 파일만 public으로 복사
mkdir -p public\nwc-viewer
xcopy /E /I temp-nwc-viewer public\nwc-viewer

# 3. 정리
rmdir /S /Q temp-nwc-viewer
```

또는 수동으로 [nwc-viewer gh-pages](https://github.com/zz85/nwc-viewer/tree/gh-pages)에서 `index.html`, `lib/`, `src/`, `bin/`, `vendor/`, `soundfonts/`, `samples/` 등 필요한 디렉터리를 `public/nwc-viewer/`로 복사합니다.

**URL 접근**: `https://your-site.com/nwc-viewer/index.html`  
기본 동작은 "Open nwc" 버튼으로 로컬 파일 선택입니다. 외부 URL 로딩은 방식 B에서 처리합니다.

---

### 방식 B: URL 파라미터로 NWC 로드 (권장)

nwc-viewer 기본 UI는 파일 선택만 지원합니다. **우리 서버에 있는 NWC URL**을 자동으로 열려면 wrapper 페이지가 필요합니다.

#### B-1. wrapper 페이지 생성

`public/nwc-viewer/` 복사 후, `public/nwc-viewer/player.html` 같은 wrapper를 만듭니다.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NWC 악보 보기</title>
  <link rel="stylesheet" href="index.html의 스타일 또는 공통 CSS">
</head>
<body>
  <div id="container"></div>
  <script type="module">
    // URL에서 ?file=/uploads/sheet-music/nwc/xxx.nwc 추출
    const params = new URLSearchParams(location.search);
    const fileUrl = params.get('file') || params.get('url');
    
    if (!fileUrl) {
      document.getElementById('container').innerHTML = '<p>파일 URL이 없습니다.</p>';
    } else {
      const absoluteUrl = fileUrl.startsWith('/') ? location.origin + fileUrl : fileUrl;
      const res = await fetch(absoluteUrl);
      const arrayBuffer = await res.arrayBuffer();
      
      // nwc-viewer의 decodeNwcArrayBuffer + 렌더 로직 호출
      // (nwc-viewer가 모듈로 노출되어 있다면)
      // window.loadNwcFromArrayBuffer?.(arrayBuffer);
      // 또는 iframe으로 index.html을 띄운 뒤 postMessage로 arrayBuffer 전달
    }
  </script>
</body>
</html>
```

nwc-viewer가 **모듈 API를 외부에 노출하지 않을 수 있어**, 실제로는 **iframe + postMessage** 방식이 더 현실적입니다.

#### B-2. iframe + postMessage 방식 (실제 구현 시 추천)

1. **부모 페이지** (예: `/sheet-music/[id]`):
   - NWC 파일 URL을 알면 iframe으로 `public/nwc-viewer/index.html` 로드
   - `iframe.contentWindow.postMessage({ type: 'LOAD_NWC', url: nwcFileUrl }, '*')` 전송

2. **nwc-viewer 쪽**:
   - index.html 또는 초기화 스크립트에 `window.addEventListener('message', ...)` 추가
   - `event.data.type === 'LOAD_NWC'`이면 `fetch(event.data.url)` → ArrayBuffer → 기존 "Open nwc" 처리와 동일한 파이프라인 호출

nwc-viewer는 현재 postMessage 수신 코드가 없으므로, **fork 후 수정**하거나, **wrapper용 별도 HTML**을 두고 nwc-viewer를 수정·빌드하는 방식이 필요합니다.

---

### 방식 C: 서브모듈 + 빌드 (유지보수용)

소스 수정이 필요하면 submodule로 넣고 빌드합니다.

```bash
cd d:\mrds
git submodule add https://github.com/zz85/nwc-viewer.git lib/nwc-viewer
cd lib/nwc-viewer
bun install   # package.json에 bun 사용
bun run build # 또는 npm script 확인
# 빌드 결과물을 public/nwc-viewer로 복사
```

---

## 3. mrds UI 연결

### NWC가 메인 파일인 경우 (nwc 폴더)

`SheetMusicView`에서 `sheetMusic.filepath`가 `.nwc`인 경우:

```tsx
// SheetMusicView.tsx
const isNwc = /\.nwc$/i.test(pathOnly);

// 악보 보기 영역
{isNwc ? (
  <div className="min-h-[500px]">
    <iframe
      src={`/nwc-viewer/player.html?file=${encodeURIComponent(sheetMusic.filepath)}`}
      className="w-full border-0 rounded-lg"
      style={{ minHeight: '600px' }}
    />
  </div>
) : (isPdf || ...) ? (
  <PdfViewer url={sheetMusic.filepath} />
) : ...}
```

### NWC가 첨부 파일인 경우 (choir, art-song)

`nwcFiles`가 있을 때 "웹에서 보기" 버튼 추가:

```tsx
{hasNwc && sheetMusic.nwcFiles!.map((nwc) => (
  <div key={nwc.id} className="flex gap-2">
    <a href={`/nwc-viewer/player.html?file=${encodeURIComponent(nwc.filepath)}`} target="_blank">
      웹에서 악보 보기
    </a>
    <a href={nwc.filepath} download>NWC 다운로드</a>
  </div>
))}
```

---

## 4. player.html / URL 로딩 구현

nwc-viewer가 URL 파라미터를 기본 지원하지 않으므로, 아래 중 하나를 선택합니다.

### 옵션 4-1. nwc-viewer fork 후 수정

1. fork: https://github.com/zz85/nwc-viewer/fork  
2. `index.html` 또는 진입점 스크립트에 추가:

```js
// 페이지 로드 시
const file = new URLSearchParams(location.search).get('file');
if (file) {
  const url = file.startsWith('/') ? location.origin + file : file;
  fetch(url).then(r => r.arrayBuffer()).then(buf => {
    // 기존 "Open nwc"에서 사용하는 로드 함수 호출
    // (실제 함수명은 nwc-viewer 소스 확인)
  });
}
```

3. 빌드 후 `public/nwc-viewer/`에 배포

### 옵션 4-2. main.js 수정 — URL 파라미터 지원 (권장)

nwc-viewer 소스 분석 결과:

- `processData(arrayBuffer, filename)` — ArrayBuffer를 받아 악보 렌더링
- `ajax(url, callback)` — URL fetch 후 callback(arrayBuffer) 호출
- 기본 로드: `ajax('samples/WhatChildIsThis.nwc', (buf) => processData(buf, ...))`

`src/main.js`의 기본 로드 부분(약 85행)을 아래처럼 변경:

```js
// 기존
// ajax('samples/WhatChildIsThis.nwc', (buf) => processData(buf, 'WhatChildIsThis.nwc'))

// 변경: ?file= 파라미터가 있으면 해당 URL 로드
const fileParam = new URLSearchParams(location.search).get('file');
if (fileParam) {
  const url = fileParam.startsWith('/') ? location.origin + fileParam : fileParam;
  ajax(url, (buf) => processData(buf, fileParam.split('/').pop() || 'file.nwc'));
} else {
  ajax('samples/WhatChildIsThis.nwc', (buf) => processData(buf, 'WhatChildIsThis.nwc'));
}
```

수정 후 `bun run build`(또는 프로젝트 빌드 스크립트)로 빌드해 `public/nwc-viewer/`에 반영합니다.

---

## 5. CORS / 인증

- NWC 파일이 `/uploads/sheet-music/nwc/`에 있고, 같은 도메인이라면 **CORS 문제는 없습니다**.
- 인증이 필요하면:
  - `/api/sheet-music/nwc/[id]` 같은 API를 만들어, 세션 확인 후 파일 스트리밍
  - 또는 `public`이 아닌 `app` 라우트에서 인증 체크 후 파일 전달

---

## 6. 체크리스트

- [ ] `public/nwc-viewer/` 에 nwc-viewer 빌드/복사 완료
- [ ] `?file=...` 파라미터로 로드되는 player 또는 index 수정
- [ ] `SheetMusicView`에서 NWC일 때 iframe/링크 연결
- [ ] choir/art-song의 `nwcFiles`에 "웹에서 보기" 버튼 추가
- [ ] CHANGELOG 반영 후 배포

---

## 7. 참고

- [nwc-viewer README](https://github.com/zz85/nwc-viewer/blob/gh-pages/README.md)
- [PARSER_INTEGRATION.md](https://github.com/zz85/nwc-viewer/blob/gh-pages/lib/PARSER_INTEGRATION.md) - 파서 API
- `decodeNwcArrayBuffer(arrayBuffer)` - NWC 파싱 함수 (nwc.js)
