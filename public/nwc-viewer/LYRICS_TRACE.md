# NWC Viewer 가사 미표시 원인 추적 가이드

## 수정 내역 (2026-02)

### NWC 2.75 (NWCTXT) 가사 미표시 수정 ✅
- **원인**: V2.75는 내장 NWCTXT 사용. 1) UTF-8 인코딩 미적용 → 한글 깨짐, 2) `|Lyrics|` `|Lyric1|` 파싱 미구현
- **수정**: `parser.js` UTF-8 우선 디코딩, `nwctxt-parser.js`에 Lyrics/Lyric1~8 파싱 및 `tokenizeLyricText()` 추가
- **영향**: `남촌 D프렛.nwc` 등 NWC 2.75 한글 가사 정상 표시

---

## 조사 결과 요약

### 테스트 결과 (WhatChildIsThis.nwc)
- **파서**: 가사 57개 syllable 정상 로드 (Staff 0)
- **어댑터**: lyrics 정상 전달
- **인터프리터**: token.text 60건 이상 할당
- **결론**: 이 파일 기준으로 파이프라인은 정상 동작

### 가능한 원인 (파일/환경별)

| 구분 | 설명 | 확인 방법 |
|------|------|----------|
| **1. NWC 2.75 (NWCTXT)** | V2.75는 내장 NWCTXT 사용. UTF-8 인코딩 + \|Lyric1\| 파싱 필요 (수정됨) | `node bin/debug-lyrics.js <파일>` |
| **2. 파일에 가사 없음** | V1.75 등 일부는 parser에서 lyrics=0 | 위 명령으로 확인 |
| **3. V205 구조 차이** | V205 경로의 `numLyric`/`noLyrics` 조건 실패 시 스킵 | 콘솔 `[Lyrics Trace] V205 SKIPPED` 확인 |
| **4. 렌더링** | 폰트 미로드, 색상, 클리핑 등 | 개발자 도구로 canvas 검사 |

---

## 디버그 로그 사용법

URL에 `?trace=1` 또는 `?trace=lyrics`를 붙여 로그를 켠 뒤 **개발자 도구(F12) → Console** 탭을 확인한다.

예: `.../nwc-viewer/?file=/uploads/.../song.nwc&trace=1`

### 예시 출력
```
[Lyrics Trace] loadStaff: file.version= 514 (0x205=V205) staff= s
[Lyrics Trace] V<205 parser: staff s numLyric= 1
[Lyrics Trace] V<205 loaded lyric line 0 syllables= 57 sample= [ 'What', ' Child', ' is' ]
[Lyrics Trace] Adapter staff s lyrics lines= 1 firstLine sample= [ 'What', ' Child', ' is' ]
[Lyrics Trace] Interpreter staff s lyrics= true length= 1 firstLine= Array
[Lyrics Trace] Interpreter lyricsToken (array) length= 57 sample= [ 'What', 'Child', 'is', 'this,', 'who,' ]
```

### 해석
- `numLyric= 0` → 해당 스태프에 가사 없음 (파일/버전 특성)
- `[Lyrics Trace] V205 SKIPPED` → V205에서 lyrics 블록 조건 실패
- `lyricsToken length= 0` 또는 `lyrics= false` → 인터프리터 단계에서 가사 없음

---

## CLI로 빠른 확인

```bash
cd public/nwc-viewer
node bin/debug-lyrics.js samples/WhatChildIsThis.nwc
node bin/debug-lyrics.js nwcs/your-file.nwc
```

---

## 관련 파일

| 경로 | 역할 |
|------|------|
| `lib/nwc2xml/parser.js` | V205/V<205 lyrics 파싱 |
| `lib/nwc2xml/reader.js` | decodeString (EUC-KR 등) |
| `src/nwc.js` | convertFromNewParser, lyrics 매핑 |
| `src/interpreter.js` | lyricsToken → token.text 할당 |
| `src/layout/typeset.js` | drawForNote에서 가사 Text 생성 |
| `src/drawing.js` | Text.draw() → fillText |
| `src/constants.js` | LYRIC_FONT_STACK (한글 폰트) |
