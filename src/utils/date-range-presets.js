/**
 * Shared calendar range helpers (dashboard, shifts list, etc.).
 */

/** @param {Date} d */
export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** @param {Date} d @param {number} weekStartDay */
export function startOfWeekDate(d, weekStartDay) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const delta = (x.getDay() - weekStartDay + 7) % 7;
  x.setDate(x.getDate() - delta);
  return x;
}

/**
 * @param {'week'|'month'|'ytd'|'all'} preset
 * @param {Date} now
 * @param {number} weekStartDay
 */
export function defaultRangeForPreset(preset, now, weekStartDay) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = ymd(now);
  if (preset === 'week') {
    return { start: ymd(startOfWeekDate(now, weekStartDay)), end: today, preset: 'week' };
  }
  if (preset === 'month') {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end = ymd(new Date(y, m + 1, 0));
    return { start, end, preset: 'month' };
  }
  if (preset === 'ytd') {
    return { start: `${y}-01-01`, end: today, preset: 'ytd' };
  }
  return { start: `${y - 5}-01-01`, end: today, preset: 'all' };
}

/**
 * Seven YYYY-MM-DD strings from the user's week start, for a calendar week containing `anchorYmd`.
 * @param {string} anchorYmd
 * @param {number} weekStartDay 0=Sun … 6=Sat
 * @returns {string[]}
 */
export function enumerateWeekDates(anchorYmd, weekStartDay) {
  const raw = String(anchorYmd || '').slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (parts.length < 3 || !parts.every((n) => Number.isFinite(n))) return [];
  const anchor = new Date(parts[0], parts[1] - 1, parts[2]);
  const sod = startOfWeekDate(anchor, weekStartDay);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(sod.getFullYear(), sod.getMonth(), sod.getDate() + i);
    out.push(ymd(x));
  }
  return out;
}
