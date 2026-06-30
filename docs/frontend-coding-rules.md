# Frontend Coding Rules

## Controller First

- 생성, 저장, 외부 API 호출, localStorage draft 저장, 다운로드, 복사 같은 핵심 동작은 view 컴포넌트에 직접 넣지 않는다.
- view는 controller hook이 반환한 state와 action handler만 사용한다.
- 새 버튼이 API를 호출해야 한다면 먼저 `apps/web/src/core/TrLab/modules/controller`에 action을 추가한다.
- view 컴포넌트에서 `apps/web/src/core/TrLab/modules/clients/api.js`를 직접 import하지 않는다.

## One Feature Function Per JS File

- 신규 JS/JSX 파일은 기본적으로 top-level export 하나만 둔다.
- React 컴포넌트 파일은 주 컴포넌트 하나만 export한다. 하위 컴포넌트는 각각 별도 파일로 분리한다.
- controller hook 파일은 hook 하나만 export한다. 내부 보조 로직은 별도 helper 또는 utility 파일로 분리한다.
- helper 파일도 역할 단위로 작게 유지한다. 여러 helper가 필요하면 명확한 도메인별 파일로 나눈다.
- 기존 레거시 파일을 수정할 때는 작업 범위 안에서 새 top-level function을 추가하지 않는다. 필요하면 새 파일을 만들고 import한다.
- 5줄 이하의 JSX inline callback이나 event wrapper는 별도 파일로 분리하지 않아도 된다.
- 예외가 필요하면 파일 상단에 짧은 주석으로 이유를 남기고, 다음 리팩터 대상에 포함한다.

## View Responsibilities

- view는 레이아웃, 표시 조건, 입력 필드, 버튼 연결만 담당한다.
- view 안에서 생성/저장/다운로드/복사 로직을 중복 구현하지 않는다.
- view 안에서 localStorage, API client, 파일 다운로드 같은 부작용을 직접 다루지 않는다.
- view의 event handler는 controller action을 호출하는 얇은 함수여야 한다.

## Controller Responsibilities

- controller는 loading, error, success/cached 상태를 함께 관리한다.
- controller action 이름은 UI 문구가 아니라 동작 기준으로 짓는다.
  - Good: `createTrendPlan`, `generateImage`, `saveFinal`
  - Bad: `onClickButton`, `handleSubmit2`
- controller는 UI 레이아웃 className이나 JSX 구조를 알면 안 된다.
- 여러 화면에서 재사용할 동작은 controller에 두고, 화면별 문구와 배치는 view에 둔다.

## UI Refactor Rule

- 화면을 새로 만들 때 기존 기능을 다시 구현하지 않는다.
- 기존 controller hook을 먼저 찾고, 없으면 controller를 만든 뒤 view에 연결한다.
- 기존 뷰를 갈아엎기 전에는 필요하면 `Version1` 백업 디렉터리에 현재 뷰를 보존한다.
- 새 UI 작업 후에는 최소 `npm run build:web`를 통과시킨다.

## Current Migration Status

- 카드뉴스 제작 controller와 `CardNewsMaker` 주변 UI는 one-feature-function-per-file 기준으로 분리되어 있다.
- 대형 레거시 파일은 별도 리팩터 작업에서 분리한다.
  - `CardNews/editor/CardTextOverlayEditor.jsx`
  - `Studio/StudioView.jsx`
  - `CardNews/lib/card-news-export.js`
  - `CardNews/CardNewsPreview.jsx`
  - `Search/SearchView.jsx`
  - `Dashboard/DashboardView.jsx`
  - `Dashboard/DashboardWidgets.jsx`
