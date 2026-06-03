const KST_OFFSET_MINUTES = 9 * 60;
const DEFAULT_START_HOUR = 5;

export function getBusinessDayAnalysisWindow({
  now = new Date(),
  startHour = DEFAULT_START_HOUR,
  timezone = 'Asia/Seoul'
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const kstNow = new Date(nowDate.getTime() + KST_OFFSET_MINUTES * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  const date = kstNow.getUTCDate();
  const hour = kstNow.getUTCHours();
  const businessDate = hour < startHour
    ? new Date(Date.UTC(year, month, date - 1))
    : new Date(Date.UTC(year, month, date));
  const fromUtcMs = Date.UTC(
    businessDate.getUTCFullYear(),
    businessDate.getUTCMonth(),
    businessDate.getUTCDate(),
    startHour - 9,
    0,
    0,
    0
  );

  return {
    mode: 'business-day',
    timezone,
    startHour,
    from: new Date(fromUtcMs).toISOString(),
    to: nowDate.toISOString(),
    label: formatKstWindowLabel(new Date(fromUtcMs), startHour)
  };
}

export function resolveTrendAnalysisWindow(windowMode, now = new Date()) {
  const mode = `${windowMode ?? 'business-day'}`.trim() || 'business-day';
  if (mode === 'all' || mode === 'latest') {
    return {
      mode,
      timezone: 'Asia/Seoul',
      startHour: DEFAULT_START_HOUR,
      from: null,
      to: now.toISOString(),
      label: 'all collected signals'
    };
  }
  if (mode === '24h') {
    return {
      mode,
      timezone: 'Asia/Seoul',
      startHour: DEFAULT_START_HOUR,
      from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      to: now.toISOString(),
      label: 'last 24 hours'
    };
  }
  return getBusinessDayAnalysisWindow({ now });
}

export function getBusinessDateAnalysisWindow(dateText, {
  startHour = DEFAULT_START_HOUR,
  timezone = 'Asia/Seoul'
} = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(`${dateText ?? ''}`.trim());
  if (!match) return null;
  const [, yyyy, mm, dd] = match;
  const year = Number(yyyy);
  const month = Number(mm) - 1;
  const day = Number(dd);
  const fromUtcMs = Date.UTC(year, month, day, startHour - 9, 0, 0, 0);
  const toUtcMs = fromUtcMs + 24 * 60 * 60 * 1000;

  return {
    mode: 'business-date',
    timezone,
    startHour,
    date: `${yyyy}-${mm}-${dd}`,
    from: new Date(fromUtcMs).toISOString(),
    to: new Date(toUtcMs).toISOString(),
    label: `${yyyy}-${mm}-${dd} ${String(startHour).padStart(2, '0')}:00 KST`
  };
}

function formatKstWindowLabel(fromUtc, startHour) {
  const kst = new Date(fromUtc.getTime() + KST_OFFSET_MINUTES * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = `${kst.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${kst.getUTCDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${String(startHour).padStart(2, '0')}:00 KST`;
}
