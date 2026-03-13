# 변경 이력

## [Unreleased]

### 추가
- **악보 자료실**: NWC 웹 뷰어 통합 (zz85/nwc-viewer)
  - 메인 파일이 NWC일 때 iframe으로 악보·재생 표시
  - 합창곡·애창곡의 NWC 첨부 시 "NWC 웹에서 악보 보기" 버튼
  - `?file=` 파라미터로 우리 서버의 NWC URL 로드
  - **nwc-viewer 개선**: 한글(EUC-KR) 가사 인코딩, 한글 폰트 스택(Malgun Gothic·Noto Sans KR 등), 넓은 악보 레이아웃, 임베드 시 불필요 메뉴 숨김, 파트별 재생 선택, 재생 시 악보 스크롤 동기화
- **악보 자료실**: 제목·내용·작곡가 검색 기능 추가 (게시판과 동일한 방식)

### 수정
- **nwc-viewer**: 한글 제목·가사 표시 — EUC-KR 우선 디코딩, 시스템 폰트(Malgun Gothic 등) 우선, fillStyle 명시
- **nwc-viewer**: 줌 범위 25%~100%로 제한
- **nwc-viewer**: 선택된 Staff 파란색 표시
- **nwc-viewer**: 재생선 viewport 60px 고정, 악보만 스크롤; 끝에 닿으면 재생선이 악보 따라 이동
- **nwc-viewer**: 마디 길이 가장 긴 Staff 기준으로 맞춤 (TickTracker tickKey로 정렬)
- **nwc-viewer**: NWC 2.75(NWCTXT) 가사 표시 — UTF-8 디코딩 + Lyrics/Lyric1~8 파싱 추가 (`남촌 D프렛.nwc` 등 한글 가사 정상 표시)

- **PDF 뷰어**: 에러 메시지 에러 시에만 표시
  - 로딩 메시지 제거(스피너만 표시), Document/Page `error={null}`로 react-pdf 플래시 방지
  - `onLoadError`로 실제 에러 감지 후 400ms 지연 표시(일시적 플래시 제외)
- **PDF 뷰어**: 에러 메시지 스타일 정리
  - 빨간색 에러 UI 제거, 회색(text-stone-500)으로 통일해 "번쩍" 보이는 현상 완화
  - docError/pageError 상태 제거, 에러는 콘솔 로그로만 처리
- **PDF 뷰어**: 로딩 시 PDF 미표시 문제 수정
  - `loading={null}` 제거, Document/Page에 정상 loading prop 복원
  - 오버레이 제거 후 PDF가 정상 렌더링되도록 복구
- **PDF 뷰어**: 마지막 동작 버전(e95927f)으로 완전 복원, 미들웨어에서 `/pdfjs/` 제외 (worker·cmaps·폰트 로드 보장)
