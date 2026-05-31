# TrLab 운영 명령서

이 문서는 Windows PowerShell 기준으로 검증된 명령만 적는다.
프로젝트 위치는 `C:\Project\TrLab`이다.

## 기본 실행

```powershell
cd C:\Project\TrLab
npm run dev
```

브라우저 주소는 `http://localhost:5173`이다.

## 수집 워커 시작

```powershell
cd C:\Project\TrLab
npm run worker:win
```

기본 동작은 다음과 같다.

- 전체 수집: 30분마다
- 트렌드 반영: 00:00, 06:00, 12:00, 18:00
- 로그: `logs\collector.out.log`
- 에러 로그: `logs\collector.err.log`

## 수집 워커 중지

```powershell
cd C:\Project\TrLab
npm run worker:stop
```

## 수집 워커 재시작

```powershell
cd C:\Project\TrLab
npm run worker:restart
```

## DB 초기화

DB 초기화 전에는 워커를 먼저 멈춘다.

```powershell
cd C:\Project\TrLab
npm run worker:stop
npm run db:reset
npm run worker:win
```

초기화 대상은 다음 테이블이다.

- `signals`
- `collection_runs`
- `keyword_snapshots`
- `content_plans`

스키마와 DB 파일은 유지하고 데이터만 비운다.

## 상태 확인

```powershell
cd C:\Project\TrLab
Get-Content logs\collector.out.log -Tail 40 -Encoding utf8
Get-Content logs\collector.err.log -Tail 40 -Encoding utf8
```

현재 저장량 확인:

```powershell
cd C:\Project\TrLab
node -e "import('./src/lib/db.js').then(({getDb})=>{const db=getDb(); console.log({signals:db.prepare('select count(*) c from signals').get().c,runs:db.prepare('select count(*) c from collection_runs').get().c,snapshots:db.prepare('select count(*) c from keyword_snapshots').get().c});})"
```

## 피해야 할 방식

PowerShell 한 줄에서 환경변수와 시간을 직접 섞어 실행하지 않는다.
특히 `RANK_TIMES=00:00,06:00,12:00,18:00` 같은 값은 quoting이 깨지면 실행 에러가 날 수 있다.
대신 `npm run worker:win` 또는 `npm run worker:restart`를 사용한다.
