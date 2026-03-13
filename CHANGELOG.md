# 변경 이력

## [Unreleased]

### 수정
- **PDF 뷰어**: 로딩 시 PDF 미표시 문제 수정
  - `loading={null}` 제거, Document/Page에 정상 loading prop 복원
  - 오버레이 제거 후 PDF가 정상 렌더링되도록 복구

### 수정
- **PDF 뷰어**: `min-h` 로딩 placeholder가 PDF 렌더 실패 유발 → Document/Page에 정상 loading UI 복원
