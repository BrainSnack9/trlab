# TrLab 운영 명령서

프로젝트 위치는 macOS 기준 `/Users/educere/EducereProject/SideProject/trlab`이다.
Node.js는 `20.19.0` 이상, `25` 미만을 사용한다.

## 기본 실행

macOS:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
nvm use
npm install
cp .env.example .env.local
npm run dev:was
npm run dev:web
```

Windows PowerShell:

```powershell
cd C:\Project\TrLab
npm run dev:was
npm run dev:web
```

브라우저 주소는 `http://localhost:5173`이다. WAS 서버는 `http://localhost:5174`에서 뜨고, web의 `/api/*` 요청은 WAS로 프록시된다.

## 프로젝트 구조

```text
apps/web  Next.js UI. Vercel 배포 대상.
apps/was  API, SQLite 저장소, 수집기, 랭킹, 워커. 별도 배포 대상.
```

## 수집 워커 시작

macOS:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
npm run worker:mac
```

Windows PowerShell:

```powershell
cd C:\Project\TrLab
npm run worker:win
```

기본 동작은 다음과 같다.

- 전체 수집: 30분마다
- 트렌드 반영: 00:00, 06:00, 12:00, 18:00
- 로그: `apps/was/logs/collector.out.log`
- 에러 로그: `apps/was/logs/collector.err.log`

## 수집 워커 중지

macOS:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
npm run worker:stop:mac
```

Windows PowerShell:

```powershell
cd C:\Project\TrLab
npm run worker:stop
```

## 수집 워커 재시작

macOS:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
npm run worker:restart:mac
```

Windows PowerShell:

```powershell
cd C:\Project\TrLab
npm run worker:restart
```

## DB 초기화

DB 초기화 전에는 워커를 먼저 멈춘다.

```bash
cd /Users/educere/EducereProject/SideProject/trlab
npm run worker:stop:mac
npm run db:reset
npm run worker:mac
```

초기화 대상은 다음 테이블이다.

- `signals`
- `collection_runs`
- `keyword_snapshots`
- `content_plans`

스키마와 DB 파일은 유지하고 데이터만 비운다.

## 상태 확인

macOS:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
tail -40 apps/was/logs/collector.out.log
tail -40 apps/was/logs/collector.err.log
```

Windows PowerShell:

```powershell
cd C:\Project\TrLab
Get-Content apps\was\logs\collector.out.log -Tail 40 -Encoding utf8
Get-Content apps\was\logs\collector.err.log -Tail 40 -Encoding utf8
```

현재 저장량 확인:

```bash
cd /Users/educere/EducereProject/SideProject/trlab
node - <<'NODE'
import { all } from './apps/was/src/core/trlab/libraries/sqlite/db.js';
console.log({
  signals: (await all('select count(*) as c from signals'))[0].c,
  runs: (await all('select count(*) as c from collection_runs'))[0].c,
  snapshots: (await all('select count(*) as c from keyword_snapshots'))[0].c
});
NODE
```

## DB 선택

기본 DB는 WAS 앱 기준 로컬 SQLite 파일 `apps/was/data/trlab.sqlite`이다. 로컬에서 혼자 실행하거나 한 대의 서버에서 장기 실행할 때는 이 구성이 가장 단순하다.

Vercel 같은 서버리스 배포, 여러 기기 공유, 팀 사용, 백업/관리형 운영이 필요하면 온라인 DB로 전환한다. 현재 코드는 `sql.js` 기반 로컬 SQLite API에 맞춰져 있으므로 온라인 DB 전환 시 DB 레이어를 별도로 교체해야 한다.

Supabase 전환 설계와 초기 SQL은 다음 파일에 있다.

- `docs/supabase-db-design.md`
- `apps/was/supabase/migrations/0001_initial_schema.sql`

## 배포

web은 Vercel에 `apps/web`을 Root Directory로 지정해 배포한다. 환경변수 `WAS_URL` 또는 `NEXT_PUBLIC_WAS_URL`에는 별도로 배포한 WAS 주소를 넣는다.

WAS는 장기 실행 수집 워커와 파일 DB를 포함하므로 Vercel 함수보다 Railway, Fly.io, Render, VPS 같은 상시 실행 환경이 적합하다. 서버리스로 올릴 경우에는 SQLite 파일 저장을 Supabase Postgres 같은 외부 DB로 먼저 교체한다.

## 피해야 할 방식

PowerShell 한 줄에서 환경변수와 시간을 직접 섞어 실행하지 않는다.
특히 `RANK_TIMES=00:00,06:00,12:00,18:00` 같은 값은 quoting이 깨지면 실행 에러가 날 수 있다.
대신 `npm run worker:win` 또는 `npm run worker:restart`를 사용한다.
