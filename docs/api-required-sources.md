# TrLab API/가입 필요 소스

아래 소스는 바로 수집하지 않고, 키 발급이나 서비스 신청 후 붙이는 대상으로 분리한다.

## Naver DataLab

- 필요: Naver Developers 애플리케이션 등록
- 키: `X-Naver-Client-Id`, `X-Naver-Client-Secret`
- 용도: 검색어 트렌드, 쇼핑 인사이트
- 구현 예정 API:
  - `/api/sources/naver-datalab`
  - 키워드 그룹별 상대 검색량 저장

## Google Trends API

- 필요: Google Trends API Alpha 접근 권한 또는 대체 유료 SERP/Trends API
- 상태: 공개 RSS는 현재 `/api/signals/collect`에서 사용 중
- 용도: 장기 시계열, 지역별/기간별 비교

## Search SERP Provider

- 후보: SerpAPI, SearchAPI, Google Programmable Search
- 필요: 유료 API 키 또는 검색 엔진 설정
- 용도: 검색 결과 정규화, 스니펫 수집, 검색 의도 분류

## 운영 원칙

- 개인 모니터링이라도 공개 목록 중심으로 낮은 빈도 요청
- 본문/댓글 전문 저장은 기본 비활성
- 저장 기본값: 제목, URL, 출처, 수집 시각, 공개 지표
- 차단/캡차/로그인 우회는 구현하지 않음
