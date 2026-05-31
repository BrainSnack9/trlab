# TrLab signal collection verification report

검증 일시: 2026-05-30 10:22:14 +09:00

## 대상

- 화면: `http://localhost:5173/`
- API: `GET /api/signals/collect`
- 목적: 현재 별도 키 발급 없이 바로 수집 가능한 신호를 가져오고, 임시 수집 시그널 영역에 표시되는지 확인

## 구현 상태

- Google Trends RSS: 바로 수집 가능
- DCInside 공개 목록: 바로 수집 가능
- TheQoo 핫 게시글 공개 목록: 바로 수집 가능
- FMKorea 인기/베스트 목록: 수집 로직은 구현됨. 단, 반복 호출 시 `430` 응답이 발생할 수 있어 호출 간격을 길게 둬야 함

API 신청이나 가입이 필요한 채널은 `docs/api-required-sources.md`에 별도 정리되어 있다.

## 직접 호출 결과

명령:

```bash
node -e "fetch('http://localhost:5173/api/signals/collect').then(r=>r.json()).then(j=>console.log(JSON.stringify({count:j.count,sources:j.sources},null,2)))"
```

확인 결과:

- API 응답 자체는 `200 OK`
- Google Trends: `ok`, 10건
- DCInside: `ok`, 16건
- TheQoo: `ok`, 20건
- FMKorea: 최초 호출에서는 수집됐으나, 반복 호출 중 `430` 제한 응답 확인

샘플:

- Google Trends: `적금`, `이호선`, `이숭용`
- DCInside: `mbc) 선로 복구작업 진행중..내일 첫 열차 운행 가능?`, `국내산 세계최초 1인개발 문학 CRPG`
- TheQoo: `요즘 사람들이 더욱 이해못한다는 식객 에피소드`, `한국의 눈치문화.twt`

## 브라우저 검증

브라우저에서 `시그널 수집` 버튼을 직접 클릭해 확인했다.

- 수집 버튼 탐지: 정상
- 수집 후 임시 시그널 카드 표시: 36개 표시
- 임시 수집 시그널 영역 스크롤:
  - `overflow-y: auto`
  - 화면 표시 높이: 560px
  - 실제 콘텐츠 높이: 1936px
  - 내부 스크롤 정상
- 첫 샘플 카드 제목: `적금`

## 수정 내용

- `src/app/api/signals/collect/route.js`
  - 응답 본문을 `arrayBuffer()`로 받은 뒤 charset 기반으로 디코딩하도록 변경
  - DCInside, TheQoo의 카테고리/공지성 링크를 일부 필터링
  - HTML 엔티티 `&nbsp;`, 숫자 엔티티 디코딩 추가
  - FMKorea 차단 가능성을 줄이기 위해 브라우저형 User-Agent 적용
- `src/TrLabApp.jsx`
  - 임시 수집 시그널 결과 영역에 내부 스크롤 추가
  - 브라우저 검증용 `data-testid` 추가

## 주의 사항

- 공개 HTML 기반 수집은 사이트 구조 변경에 취약하다.
- FMKorea는 반복 호출 시 제한이 걸릴 수 있으므로 기본 주기를 20분 이상으로 두는 편이 좋다.
- 다음 단계에서는 수집 결과를 그대로 레이더에 넣기보다 제목 정규화, 중복 제거, 출처별 가중치, 급상승 판별 점수를 거친 뒤 `검증 키워드` 후보로 보내는 구조가 필요하다.
