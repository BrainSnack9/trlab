# Supabase DB Design

TrLab의 Supabase DB는 web에서 직접 접근하지 않고 `apps/was`만 service role로 접근하는 것을 기본으로 한다. web은 계속 WAS API를 호출한다.

이 설계는 “지금 필요한 CRUD”보다 데이터가 커졌을 때 버틸 수 있는 경계를 우선한다.

## Deployment Boundary

- `apps/web`: Vercel. DB 키를 두지 않는다.
- `apps/was`: Railway, Fly.io, Render, VPS 같은 상시 실행 환경. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 가진다.
- Supabase: Postgres. Auth는 당장 필수는 아니지만, 테이블에는 처음부터 `workspace_id`를 둔다.

## Scalability Principles

- Canonical table과 event table을 분리한다.
- 원천 데이터는 가능한 한 append-only 로그로 남기되, UI 조회용 최신 상태는 별도 테이블에 둔다.
- 거의 모든 핵심 테이블에 `workspace_id`, `metadata/jsonb`, `schema_version`을 둔다.
- 큰 테이블은 시간 기준 인덱스와 BRIN 인덱스를 둔다.
- 유연한 후보/기획안 데이터는 `jsonb`로 보관하되, 조회에 자주 쓰는 키워드, 점수, 시간, 상태는 컬럼으로 승격한다.
- browser anon key로 직접 읽지 않도록 RLS는 켜고 public policy는 만들지 않는다.

## Core Tables

### `workspaces`

미래 팀/계정/프로젝트 분리를 위한 tenant 경계다. 지금은 `default` workspace 하나를 사용한다.

### `signal_sources`

수집 가능한 채널 메타데이터다. 현재 코드의 `collectorMap`과 UI source 목록을 DB로 옮기기 위한 기준 테이블이다.

### `collection_runs`

수집 실행 로그다. worker 실행 단위, 실패 원인, item count, metadata를 저장한다.

대용량 대비:

- `workspace_id, finished_at desc`
- `workspace_id, source, finished_at desc`

### `signals`

중복 제거된 “현재 신호 상태” 테이블이다. 같은 source/url/canonical key는 upsert된다.

주요 필드:

- `canonical_key`: dedupe key. 초기에는 URL hash 또는 normalized URL을 사용한다.
- `url_hash`: 긴 URL 비교/검색 부담을 낮추기 위한 hash
- `quality_score`, `quality_label`, `quality_reasons`
- `tags`, `area`, `language`
- `raw_payload`, `schema_version`

대용량 대비:

- 최신 조회: `workspace_id, last_seen_at desc`
- 품질 조회: `workspace_id, quality_score desc, last_seen_at desc`
- 출처별 조회: `workspace_id, source, last_seen_at desc`
- 제목 검색: `pg_trgm` GIN
- tag/jsonb 검색: GIN

### `signal_observations`

수집 때마다 쌓이는 append-only 관측 로그다. `signals`가 현재 상태라면, 이 테이블은 히스토리와 분석용 이벤트 스트림이다.

이 테이블은 가장 빨리 커진다. 그래서:

- `observed_at` BRIN 인덱스를 둔다.
- 오래된 데이터는 월별 export/archive 또는 retention 정책으로 줄일 수 있다.
- 필요해지면 Postgres range partition으로 가장 먼저 분리할 후보가 이 테이블이다.

### `trend_snapshots`

랭킹 실행 1회에 대한 헤더다. 기존 SQLite의 `keyword_snapshots` 그룹을 명시적인 snapshot id로 승격했다.

### `trend_snapshot_items`

스냅샷 안의 개별 후보 목록이다.

대용량 대비:

- snapshot 내부 랭킹 조회는 `snapshot_id, score desc`
- 키워드 장기 추적은 `workspace_id, keyword_key, created_at desc`
- 후보 전체 JSON은 `candidate jsonb`

### `content_plans`

카드뉴스 기획안의 최신 상태다. 자주 조회하는 `keyword_key`, `status`, `updated_at`은 컬럼이고, 상세 기획안은 `plan jsonb`다.

### `content_plan_versions`

기획안 수정 이력이다. 지금 당장 UI에서 쓰지는 않아도, 생성형 AI 결과물은 재생성/수정 이력이 중요해서 별도 테이블로 둔다.

### `search_verifications`

검색 검증 캐시다. API 비용과 latency를 줄이기 위해 `query_key`, `expires_at` 기준으로 재사용할 수 있다.

### `generated_assets`

이미지 생성/카드뉴스 에셋 이력이다. Supabase Storage를 붙이면 `storage_bucket`, `storage_path`를 사용한다.

### `job_runs`

worker, ranking, import 같은 장기 작업 상태 추적용이다. WAS를 여러 인스턴스로 늘릴 때 heartbeat와 running job 확인에 쓴다.

## RLS

초기 마이그레이션은 모든 테이블에 RLS를 켠다. 별도 public policy는 만들지 않는다.

이 의미는 다음과 같다.

- browser anon key로는 읽고 쓸 수 없다.
- WAS service role은 RLS를 우회해서 읽고 쓴다.
- 나중에 사용자별 워크스페이스가 생기면 `workspace_id`, `user_id` 기반 policy를 추가한다.

## Partition Strategy

처음부터 partition을 켜면 마이그레이션과 Supabase dashboard 운용이 번거로워진다. 대신 가장 커질 테이블인 `signal_observations`에는 BRIN 인덱스를 먼저 둔다.

월 수백만 row 이상으로 커지면 다음 순서로 확장한다.

1. `signal_observations`를 `observed_at` 월별 range partition으로 전환한다.
2. 90일 이상 지난 observation은 object storage로 export 후 delete한다.
3. `signals`는 canonical 최신 상태만 유지한다.
4. `trend_snapshot_items`는 오래된 snapshot 단위로 archive한다.

## Migration

초기 스키마:

```text
apps/was/supabase/migrations/0001_initial_schema.sql
```

Supabase SQL editor에서 실행하거나, Supabase CLI를 붙인 뒤 migration으로 적용한다.

## Next Implementation Step

1. `@supabase/supabase-js`를 `apps/was`에 추가한다.
2. `apps/was/src/core/trlab/libraries/sqlite/db.js` 앞에 storage facade를 둔다.
3. 현재 `sql.js` 구현은 `apps/was/src/core/trlab/libraries/sqlite/db.js`에 보관한다.
4. `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 있으면 Supabase adapter를 사용한다.
5. 없으면 로컬 개발용 SQLite adapter를 사용한다.
6. `saveCollectionResult`는 `collection_runs`, `signals`, `signal_observations`를 함께 쓴다.
7. `saveKeywordSnapshots`는 `trend_snapshots`, `trend_snapshot_items`로 쓴다.
