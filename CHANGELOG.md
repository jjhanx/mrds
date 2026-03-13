# 변경 이력

## [Unreleased]

### 수정
- **PDF 뷰어**: 에러 메시지 스타일 정리
  - 빨간색 에러 UI 제거, 회색(text-stone-500)으로 통일해 "번쩍" 보이는 현상 완화
  - docError/pageError 상태 제거, 에러는 콘솔 로그로만 처리
- **PDF 뷰어**: 로딩 시 PDF 미표시 문제 수정
  - `loading={null}` 제거, Document/Page에 정상 loading prop 복원
  - 오버레이 제거 후 PDF가 정상 렌더링되도록 복구

### 수정
- **PDF 뷰어**: 마지막 동작 버전(e95927f)으로 완전 복원, 미들웨어에서 `/pdfjs/` 제외 (worker·cmaps·폰트 로드 보장)
