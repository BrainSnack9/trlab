# Web Controller Action Map

프론트엔드 코딩 기본 규칙은 `docs/frontend-coding-rules.md`를 따른다.

UI는 자주 바뀔 수 있으므로 생성, 저장, 외부 API 호출, draft 저장처럼 재사용해야 하는 동작은 `apps/web/src/core/TrLab/modules/controller`에서 관리한다.

## Card Production

- `useContentPlanController`
  - 트렌드 기반 콘텐츠 기획 생성
  - 직접 브리프 기반 콘텐츠 기획 생성
  - 기획 생성 loading/error/cached 상태
  - 수동 브리프를 studio payload로 변환

- `useCardNewsMakerController`
  - 카드뉴스 제작 화면의 선택 카드, 스타일, 채널명 상태
  - 카드별 생성 이미지와 이미지 히스토리 draft 저장
  - 현재 카드 PNG 다운로드
  - 전체 원고/게시 원고 복사

- `useCardImageController`
  - 카드 배경 프롬프트 미리보기
  - Pexels 우선/AI 전용/수정 재생성
  - 생성 이미지 반영
  - 빈 캔버스 이미지 fallback

- `useCardTextOverlayActionsController`
  - 제품 이미지 검색/생성
  - 편집 캔버스 합성 확정
  - 최종 PNG 저장
  - 편집 action loading/error 상태

## Still View-Owned

아래는 아직 각 화면 안에 남아 있는 UI 주변 동작이다. 다음 UI 재구성 때 재사용 가능성이 커지면 별도 controller로 승격한다.

- `SearchView`: 검색 검증 실행
- `DashboardView`: 날짜별 수집 요약 조회
- `CollectionView`, `CollectionTabs`, `TrendHistory`: 수집 런타임/히스토리 조회
- `Profiles/ProfileView`: 프로필 추천 생성 및 저장
- `SettingsView`: DB/collector admin action
- `CardTextOverlayEditor`: 레이어, 도형, 데이터 오버레이의 세부 편집 상태

## Rule

새 UI에서 생성/편집 버튼을 만들 때는 API client를 직접 import하지 않는다. 먼저 controller에 action을 추가하고, 화면에서는 controller가 반환한 handler만 연결한다.
