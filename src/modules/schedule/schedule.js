import { db, getAppState, setAppState } from '../../core/db.js';
import { store } from '../../core/store.js';
import { formatCurrency } from '../../utils/formatters.js';
import { t } from '../../utils/strings.js';

const APP_STATE_KEYS = {
  planning: 'schedule_planning_shifts',
  offDays: 'schedule_non_delivery_days',
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripFabQueryFromHash() {
  try {
    const raw = window.location.hash || '';
    const qi = raw.indexOf('?');
    if (qi === -1) return;
    const base = raw.slice(0, qi);
    const params = new URLSearchParams(raw.slice(qi + 1));
    if (!params.has('fab')) return;
    params.delete('fab');
    const qs = params.toString();
    const next = qs ? `${base}?${qs}` : base;
    const path = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', `${path}${next}`);
  } catch {
    /* ignore */
  }
}

function parseYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function weekStart(date, weekStartDay) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

function dayName(idx) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx] || 'Day';
}

function minutesFromShift(shift) {
  const explicit = num(shift.activeMinutes || shift.onlineMinutes);
  if (explicit > 0) return explicit;
  const date = typeof shift.date === 'string' ? shift.date : null;
  const start = typeof shift.startTime === 'string' ? shift.startTime : null;
  const end = typeof shift.endTime === 'string' ? shift.endTime : null;
  if (!date || !start || !end) return 0;
  const s = new Date(`${date}T${start}:00`);
  const e = new Date(`${date}T${end}:00`);
  const delta = e.getTime() - s.getTime();
  if (!Number.isFinite(delta)) return 0;
  return Math.max(0, Math.round(delta / 60000));
}

function grossFromShift(shift) {
  return num(shift.grossEarnings ?? shift.gross);
}

function shiftStartDateTime(shift) {
  const date = typeof shift.date === 'string' ? shift.date : null;
  const start = typeof shift.startTime === 'string' ? shift.startTime : '00:00';
  if (!date) return null;
  const dt = new Date(`${date}T${start}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function shiftEndDateTime(shift) {
  const date = typeof shift.date === 'string' ? shift.date : null;
  if (!date) return null;
  const start = typeof shift.startTime === 'string' ? shift.startTime : '00:00';
  const end = typeof shift.endTime === 'string' ? shift.endTime : null;
  const minutes = minutesFromShift(shift);
  if (end) {
    const dt = new Date(`${date}T${end}:00`);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const s = new Date(`${date}T${start}:00`);
  if (Number.isNaN(s.getTime())) return null;
  s.setMinutes(s.getMinutes() + Math.max(0, minutes));
  return s;
}

function isNightShift(shift) {
  const start = typeof shift.startTime === 'string' ? shift.startTime : '';
  const end = typeof shift.endTime === 'string' ? shift.endTime : '';
  const startHour = Number(start.slice(0, 2));
  const endHour = Number(end.slice(0, 2));
  if (Number.isFinite(startHour) && startHour >= 22) return true;
  if (Number.isFinite(endHour) && endHour <= 5) return true;
  if (start && end) {
    const date = typeof shift.date === 'string' ? shift.date : '';
    const s = new Date(`${date}T${start}:00`);
    const e = new Date(`${date}T${end}:00`);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e.getTime() < s.getTime()) return true;
  }
  return false;
}

function bucketForHeat(v) {
  if (v <= 0) return 0;
  if (v < 40) return 1;
  if (v < 80) return 2;
  if (v < 140) return 3;
  return 4;
}

async function getScheduleState() {
  const [planningRaw, offRaw] = await Promise.all([
    getAppState(APP_STATE_KEYS.planning),
    getAppState(APP_STATE_KEYS.offDays),
  ]);
  const planning = Array.isArray(planningRaw)
    ? planningRaw
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
          date: typeof row.date === 'string' ? row.date : '',
          startTime: typeof row.startTime === 'string' ? row.startTime : '',
          endTime: typeof row.endTime === 'string' ? row.endTime : '',
          platformId: typeof row.platformId === 'string' ? row.platformId : 'other',
        }))
        .filter((row) => parseYmd(row.date))
    : [];
  const offDays = new Set(
    Array.isArray(offRaw) ? offRaw.filter((row) => typeof row === 'string' && parseYmd(row)) : [],
  );
  return { planning, offDays };
}

async function listShiftsForMonth(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return db.shifts
    .where('date')
    .between(ymd(start), ymd(end), true, true)
    .filter((row) => row.deletedAt == null)
    .toArray();
}

async function loadScheduleModel(referenceDate = new Date()) {
  const user = store.get('user');
  const weekStartDay = num(user?.locale?.weekStartDay, 0);
  const currency = user?.locale?.currency || 'USD';
  const localeCountry = user?.locale?.country || 'US';
  const weekStartDate = weekStart(referenceDate, weekStartDay);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const [weekRows, monthRows, allRows, state] = await Promise.all([
    db.shifts.where('date').between(ymd(weekStartDate), ymd(weekEndDate), true, true).filter((s) => s.deletedAt == null).toArray(),
    listShiftsForMonth(referenceDate.getFullYear(), referenceDate.getMonth()),
    db.shifts.filter((s) => s.deletedAt == null).toArray(),
    getScheduleState(),
  ]);

  const weekTotals = new Map();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    weekTotals.set(ymd(d), { date: ymd(d), gross: 0, minutes: 0, shifts: [], plan: [] });
  }
  for (const shift of weekRows) {
    const key = String(shift.date || '');
    if (!weekTotals.has(key)) continue;
    const cell = weekTotals.get(key);
    cell.gross += grossFromShift(shift);
    cell.minutes += minutesFromShift(shift);
    cell.shifts.push(shift);
  }
  for (const plan of state.planning) {
    if (!weekTotals.has(plan.date)) continue;
    weekTotals.get(plan.date).plan.push(plan);
  }

  const monthByDate = new Map();
  for (const shift of monthRows) {
    const key = String(shift.date || '');
    if (!monthByDate.has(key)) monthByDate.set(key, { gross: 0, platforms: new Set() });
    const slot = monthByDate.get(key);
    slot.gross += grossFromShift(shift);
    slot.platforms.add(String(shift.platformId || 'other'));
  }

  const weekMinutes = [...weekTotals.values()].reduce((sum, day) => sum + day.minutes, 0);
  const weekHours = weekMinutes / 60;
  const weekGross = [...weekTotals.values()].reduce((sum, day) => sum + day.gross, 0);
  const weekGoal = num(store.get('currentWeekGoal'));
  const avgHourly = weekMinutes > 0 ? weekGross / (weekMinutes / 60) : 0;
  const optimalHours = weekGoal > 0 && avgHourly > 0 ? weekGoal / avgHourly : 0;
  const remainingHours = Math.max(0, optimalHours - weekHours);

  const scatter = monthRows
    .map((shift) => {
      const hours = minutesFromShift(shift) / 60;
      const gross = grossFromShift(shift);
      return { hours, gross, rate: hours > 0 ? gross / hours : 0, date: shift.date };
    })
    .filter((row) => row.hours > 0 && row.gross >= 0);

  const hourlyBuckets = new Array(24).fill(0);
  for (const shift of allRows) {
    const start = typeof shift.startTime === 'string' ? Number(shift.startTime.slice(0, 2)) : NaN;
    if (!Number.isFinite(start) || start < 0 || start > 23) continue;
    hourlyBuckets[start] += grossFromShift(shift);
  }
  const peakThreshold = [...hourlyBuckets].sort((a, b) => b - a)[Math.max(0, Math.floor(hourlyBuckets.length * 0.2) - 1)] || 0;

  const sortedByStart = [...allRows]
    .map((shift) => ({ shift, start: shiftStartDateTime(shift), end: shiftEndDateTime(shift) }))
    .filter((row) => row.start && row.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const restGaps = [];
  for (let i = 1; i < sortedByStart.length; i += 1) {
    const prev = sortedByStart[i - 1];
    const curr = sortedByStart[i];
    const gap = curr.start.getTime() - prev.end.getTime();
    if (gap >= 0) {
      restGaps.push({
        before: ymd(prev.start),
        after: ymd(curr.start),
        hours: gap / 3600000,
      });
    }
  }
  const shortRests = restGaps.filter((g) => g.hours < 8);
  const minRest = restGaps.length ? Math.min(...restGaps.map((g) => g.hours)) : 0;

  return {
    now: referenceDate,
    user,
    currency,
    localeCountry,
    weekStartDate,
    monthStart,
    monthEnd,
    weekTotals,
    monthByDate,
    offDays: state.offDays,
    weekHours,
    weekGross,
    weekGoal,
    optimalHours,
    remainingHours,
    scatter,
    hourlyBuckets,
    peakThreshold,
    restGaps,
    shortRests,
    minRest,
  };
}

function renderWeekGrid(model) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(model.weekStartDate);
    day.setDate(day.getDate() + i);
    const key = ymd(day);
    const bucket = model.weekTotals.get(key) || { gross: 0, minutes: 0, shifts: [], plan: [] };
    const hours = bucket.minutes / 60;
    days.push(`
      <article class="schedule-week-cell ${model.offDays.has(key) ? 'is-off-day' : ''}">
        <header>
          <strong>${esc(dayName(day.getDay()))}</strong>
          <span>${esc(day.getDate())}</span>
        </header>
        <div class="schedule-shift-blocks">
          ${bucket.shifts
            .map((shift) => {
              const st = shift.startTime || '--:--';
              const et = shift.endTime || '--:--';
              const night = isNightShift(shift);
              return `<span class="schedule-shift-chip ${night ? 'is-night' : ''}" title="${esc(`${st}-${et}`)}">${esc(st)}-${esc(et)}${night ? ' 🌙' : ''}</span>`;
            })
            .join('')}
          ${bucket.plan
            .map(
              (shift) =>
                `<span class="schedule-shift-chip is-plan" title="Planned">${esc(shift.startTime || '--:--')}-${esc(shift.endTime || '--:--')} · plan</span>`,
            )
            .join('')}
        </div>
        <footer>
          <span>${esc(formatCurrency(bucket.gross, model.localeCountry, { currency: model.currency }))}</span>
          <span>${esc(hours.toFixed(1))}h</span>
        </footer>
      </article>
    `);
  }
  return days.join('');
}

function renderMonthGrid(model) {
  const firstDay = new Date(model.monthStart);
  const start = weekStart(firstDay, 0);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = ymd(d);
    const inMonth = d.getMonth() === model.monthStart.getMonth();
    const entry = model.monthByDate.get(key) || { gross: 0, platforms: new Set() };
    const bucket = bucketForHeat(entry.gross);
    const dots = [...entry.platforms].slice(0, 4);
    cells.push(`
      <div class="schedule-month-cell ${inMonth ? '' : 'is-outside'} heat-${bucket} ${model.offDays.has(key) ? 'is-off-day' : ''}">
        <div class="schedule-month-day">${esc(d.getDate())}</div>
        <div class="schedule-month-earn">${entry.gross > 0 ? esc(formatCurrency(entry.gross, model.localeCountry, { currency: model.currency })) : ''}</div>
        <div class="schedule-platform-dots">${dots.map((pid) => `<span class="dot dot-${esc(pid)}"></span>`).join('')}</div>
      </div>
    `);
  }
  return cells.join('');
}

function renderStats(model) {
  const weekPct = model.optimalHours > 0 ? Math.min(100, (model.weekHours / model.optimalHours) * 100) : 0;
  const peakHours = model.hourlyBuckets
    .map((value, hour) => ({ value, hour }))
    .filter((row) => row.value >= model.peakThreshold && row.value > 0)
    .map((row) => `${String(row.hour).padStart(2, '0')}:00`)
    .slice(0, 6);
  const bestRate = model.scatter.length ? Math.max(...model.scatter.map((p) => p.rate)) : 0;
  const worstRate = model.scatter.length ? Math.min(...model.scatter.map((p) => p.rate)) : 0;
  return `
    <section class="schedule-metrics card">
      <h2>Hours tracker</h2>
      <div class="schedule-hours-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${esc(weekPct.toFixed(0))}">
        <span style="width:${esc(weekPct.toFixed(2))}%"></span>
      </div>
      <p>${esc(model.weekHours.toFixed(1))}h logged this week${model.optimalHours > 0 ? ` · target pace ${esc(model.optimalHours.toFixed(1))}h` : ''}</p>
      <p>${model.remainingHours > 0 ? `${esc(model.remainingHours.toFixed(1))}h remaining to hit weekly goal pace` : 'Goal pace reached for this week'}</p>
      <p>Efficiency spread: best ${esc(formatCurrency(bestRate, model.localeCountry, { currency: model.currency }))}/h · lowest ${esc(formatCurrency(worstRate, model.localeCountry, { currency: model.currency }))}/h</p>
      <p>Peak earning hours: ${peakHours.length ? esc(peakHours.join(', ')) : 'Not enough history yet'}</p>
      <p>Rest tracker: minimum gap ${esc(model.minRest.toFixed(1))}h · short gaps (&lt;8h): ${esc(model.shortRests.length)}</p>
    </section>
  `;
}

function renderScatter(model) {
  if (model.scatter.length === 0) {
    return '<p class="schedule-empty">No shifts in this month yet.</p>';
  }
  const maxHours = Math.max(...model.scatter.map((p) => p.hours), 1);
  const maxGross = Math.max(...model.scatter.map((p) => p.gross), 1);
  return `
    <div class="schedule-scatter">
      ${model.scatter
        .map((point) => {
          const x = (point.hours / maxHours) * 100;
          const y = 100 - (point.gross / maxGross) * 100;
          const nightTag = point.date ? '' : '';
          return `<span class="schedule-point" style="left:${esc(x.toFixed(2))}%;top:${esc(y.toFixed(2))}%;" title="${esc(`${point.date}: ${point.hours.toFixed(1)}h / ${formatCurrency(point.gross, model.localeCountry, { currency: model.currency })}${nightTag}`)}"></span>`;
        })
        .join('')}
    </div>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} [ctx]
 */
export async function renderScheduleModule(root, ctx = {}) {
  const model = await loadScheduleModel(new Date());
  root.innerHTML = `
    <section class="schedule-view">
      <header class="card card-raised">
        <h1>${esc(t('schedule.title'))}</h1>
        <p>${esc(t('schedule.subtitle'))}</p>
      </header>
      <section class="schedule-grid-2">
        <article class="card">
          <h2>${esc(t('schedule.weekView'))}</h2>
          <div class="schedule-week-grid">${renderWeekGrid(model)}</div>
        </article>
        <article class="card">
          <h2>${esc(t('schedule.monthView'))}</h2>
          <div class="schedule-month-grid">${renderMonthGrid(model)}</div>
        </article>
      </section>
      <section class="schedule-grid-2">
        <article class="card">
          <h2>${esc(t('schedule.planningMode'))}</h2>
          <p>Use the actions below to mark days off and add placeholder shifts for upcoming plans.</p>
          <div class="schedule-actions">
            <button class="btn btn-secondary" type="button" data-action="add-plan">Add placeholder shift</button>
            <button class="btn btn-ghost" type="button" data-action="mark-off-day">Mark non-delivery day</button>
          </div>
        </article>
        ${renderStats(model)}
      </section>
      <section class="card">
        <h2>Time vs earnings efficiency</h2>
        ${renderScatter(model)}
      </section>
    </section>
  `;

  root.querySelector('[data-action="add-plan"]')?.addEventListener('click', async () => {
    const date = window.prompt('Plan date (YYYY-MM-DD):', ymd(new Date()));
    if (!date || !parseYmd(date)) return;
    const startTime = window.prompt('Start time (HH:MM):', '11:00') || '';
    const endTime = window.prompt('End time (HH:MM):', '14:00') || '';
    const platformId = window.prompt('Platform id:', 'other') || 'other';
    const raw = (await getAppState(APP_STATE_KEYS.planning)) || [];
    const next = Array.isArray(raw) ? [...raw] : [];
    next.push({ date, startTime, endTime, platformId });
    await setAppState(APP_STATE_KEYS.planning, next.slice(-60));
    await renderScheduleModule(root, {});
  });

  root.querySelector('[data-action="mark-off-day"]')?.addEventListener('click', async () => {
    const date = window.prompt('Off day (YYYY-MM-DD):', ymd(new Date()));
    if (!date || !parseYmd(date)) return;
    const raw = (await getAppState(APP_STATE_KEYS.offDays)) || [];
    const set = new Set(Array.isArray(raw) ? raw.filter((d) => typeof d === 'string') : []);
    if (set.has(date)) set.delete(date);
    else set.add(date);
    await setAppState(APP_STATE_KEYS.offDays, [...set].sort());
    await renderScheduleModule(root, {});
  });

  if (ctx && /** @type {{ fabQuickSchedule?: boolean }} */ (ctx).fabQuickSchedule) {
    queueMicrotask(() => {
      stripFabQueryFromHash();
      const btn = root.querySelector('[data-action="add-plan"]');
      btn?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      btn?.focus({ preventScroll: true });
    });
  }
}
