# 변경 이력

## [Unreleased]

### 수정
- **PDF 뷰어**: 로딩 시 PDF 미표시 문제 수정
  - `loading={null}` 제거, Document/Page에 정상 loading prop 복원
  - 오버레이 제거 후 PDF가 정상 렌더링되도록 복구

### 수정
- **PDF 뷰어**: 마지막 동작 버전(e95927f)으로 완전 복원, 미들웨어에서 `/pdfjs/` 제외 (worker·cmaps·폰트 로드 보장)
