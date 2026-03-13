# 변경 이력

## [Unreleased]

### 수정
- **PDF 뷰어**: 로딩 시 PDF 미표시 문제 수정
  - `loading={null}` 제거, Document/Page에 정상 loading prop 복원
  - 오버레이 제거 후 PDF가 정상 렌더링되도록 복구

### 개선
- **PDF 뷰어**: 메시지 정리 ("불러오는 중...", "표시할 수 없습니다")
