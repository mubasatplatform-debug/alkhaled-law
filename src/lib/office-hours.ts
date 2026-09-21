/**
 * Office working hours. Kept free of other app imports so both the schedule
 * core and the server can use it, and so it runs under `node --test` directly.
 */
export interface OfficeHours {
  /** Weekdays the office takes bookings, 0 = Sunday … 6 = Saturday. */
  workDays: number[];
  /** Minutes after midnight, Riyadh time. */
  startMin: number;
  endMin: number;
  /** Gap kept between two sessions. */
  bufferMin: number;
}

/** Booking grid granularity. Fixed: the calendar and slot chips assume it. */
export const SLOT_MIN = 30;
export const BUFFER_CHOICES = [0, 10, 15, 30] as const;

export const DEFAULT_OFFICE_HOURS: OfficeHours = {
  workDays: [0, 1, 2, 3, 4],
  startMin: 9 * 60,
  endMin: 17 * 60,
  bufferMin: 15,
};

export const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export type HoursResult = { ok: true; hours: OfficeHours } | { ok: false; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** The single gate every stored or submitted value passes through. */
export function normalizeOfficeHours(input: unknown): HoursResult {
  if (!input || typeof input !== "object") return { ok: false, error: "بيانات الدوام غير صالحة." };
  const raw = input as Record<string, unknown>;

  const days = Array.isArray(raw.workDays) ? raw.workDays.map(Number) : [];
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return { ok: false, error: "اختر يوم عمل واحداً على الأقل." };
  }
  const workDays = [...new Set(days)].sort((a, b) => a - b);

  const { startMin, endMin, bufferMin } = raw;
  if (!isInt(startMin) || !isInt(endMin) || startMin % SLOT_MIN || endMin % SLOT_MIN) {
    return { ok: false, error: "البداية والنهاية تكونان على نصف ساعة." };
  }
  if (startMin < 0 || endMin > 24 * 60 || endMin - startMin < 2 * SLOT_MIN) {
    return { ok: false, error: "نهاية الدوام بعد بدايته بساعة على الأقل." };
  }
  if (!isInt(bufferMin) || !(BUFFER_CHOICES as readonly number[]).includes(bufferMin)) {
    return { ok: false, error: "الفاصل بين الجلسات غير مدعوم." };
  }
  return { ok: true, hours: { workDays, startMin, endMin, bufferMin } };
}

/** Same shape as schedule.formatTime ("9:00 ص"), duplicated to avoid a cycle. */
export function clockLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`;
}

/**
 * "الأحد–الخميس" for a run of consecutive days (including one that wraps past
 * Saturday), otherwise the names joined. Seven days read as "كل أيام الأسبوع".
 */
export function describeDays(workDays: number[]): string {
  const days = [...new Set(workDays)].sort((a, b) => a - b);
  if (days.length === 7) return "كل أيام الأسبوع";
  if (days.length === 1) return WEEKDAY_NAMES[days[0]];
  // A run is consecutive days; find where it starts, allowing a wrap at the week end.
  const set = new Set(days);
  const start = days.find((d) => !set.has((d + 6) % 7));
  if (start !== undefined) {
    let len = 0;
    while (set.has((start + len) % 7)) len++;
    if (len === days.length && len >= 3) {
      return `${WEEKDAY_NAMES[start]}–${WEEKDAY_NAMES[(start + len - 1) % 7]}`;
    }
  }
  return days.map((d) => WEEKDAY_NAMES[d]).join("، ");
}

export function describeOfficeHours(h: OfficeHours): string {
  const gap = h.bufferMin ? `فاصل ${h.bufferMin} دقيقة` : "بلا فاصل";
  return `${describeDays(h.workDays)} · ${clockLabel(h.startMin)}–${clockLabel(h.endMin)} · خانات ${SLOT_MIN} دقيقة · ${gap}`;
}
