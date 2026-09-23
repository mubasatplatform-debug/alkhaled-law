import { DEFAULT_OFFICE_HOURS, SLOT_MIN, type OfficeHours } from "./office-hours.ts";
import type { Appointment, Client } from "./types";

/**
 * The hours every scheduling function below works against. They start at the
 * defaults and are replaced with the office's saved hours: the server loads them
 * before computing slots or accepting a booking, and the browser once the shell
 * has fetched them. The hours are office-wide, so one shared value is right.
 */
let activeHours: OfficeHours = DEFAULT_OFFICE_HOURS;

export function setActiveOfficeHours(hours: OfficeHours) {
  activeHours = hours;
}

export function getActiveOfficeHours(): OfficeHours {
  return activeHours;
}

/**
 * The office day in Riyadh. The server runs in UTC, so deriving the date from
 * the raw clock would roll over three hours early every night.
 */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Was a frozen "2026-09-15" string, which made the assistant offer slots in the
 * past once that day passed. It now tracks the real office day; keep it out of
 * anything that must stay stable across a midnight boundary.
 */
export const TODAY = todayISO();
export const SLOT = SLOT_MIN;
// Demo occupancy is relative to today, so the office screens never open on a
// day that has already passed.
export const OFFICE_SEED_OCC: { date: string; startMin: number; durationMin: number }[] = [
  { date: TODAY, startMin: 10 * 60, durationMin: 30 },
  { date: TODAY, startMin: 12 * 60 + 30, durationMin: 45 },
  { date: TODAY, startMin: 16 * 60, durationMin: 30 },
  { date: addDays(TODAY, 1), startMin: 11 * 60, durationMin: 30 },
  { date: addDays(TODAY, 2), startMin: 9 * 60 + 30, durationMin: 45 },
];

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function parseDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function startOfWeek(iso: string) {
  const d = parseDate(iso);
  d.setDate(d.getDate() - d.getDay());
  return toISO(d);
}

export function weekDays(iso: string) {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayName(iso: string) {
  return DAY_NAMES[parseDate(iso).getDay()];
}

export function formatDateLabel(iso: string) {
  const d = parseDate(iso);
  return `${DAY_NAMES[d.getDay()]}، ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 || 12;
  const suffix = h < 12 ? "ص" : "م";
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatHour(min: number) {
  const h = Math.floor(min / 60);
  const h12 = h % 12 || 12;
  const suffix = h < 12 ? "ص" : "م";
  return `${h12} ${suffix}`;
}

export function isWorkday(iso: string) {
  return activeHours.workDays.includes(parseDate(iso).getDay());
}

/** Whether a session fits inside the office day on an open day. */
export function withinOfficeHours(date: string, startMin: number, durationMin: number) {
  return (
    isWorkday(date) &&
    startMin >= activeHours.startMin &&
    startMin + durationMin <= activeHours.endMin &&
    (startMin - activeHours.startMin) % SLOT === 0
  );
}

/**
 * A booking slot as it arrives from an untrusted source (the assistant's JSON
 * or a client request): the date must be exactly YYYY-MM-DD because every
 * availability check compares dates as strings, the minute must be a whole
 * number, and a slot in the past cannot be booked.
 */
export function slotInputProblem(
  date: string,
  startMin: number,
  today: string = todayISO(),
): "shape" | "past" | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(startMin)) return "shape";
  if (date < today) return "past";
  return null;
}

export function durationFor(kind: Appointment["kind"]) {
  if (kind === "review") return 45;
  return 30;
}

export function titleFor(kind: Appointment["kind"]) {
  if (kind === "video") return "استشارة مرئية";
  if (kind === "review") return "مراجعة عقد";
  return "متابعة عميل";
}

export function activeOnDate(list: Appointment[], date: string) {
  return list.filter((a) => a.date === date && !a.live && a.status !== "cancelled");
}

function blocks(a: Appointment) {
  return { start: a.startMin, end: a.startMin + a.durationMin + activeHours.bufferMin };
}

export function hasConflict(
  list: Appointment[],
  date: string,
  startMin: number,
  durationMin: number,
  exceptId?: string,
) {
  const start = startMin;
  const end = startMin + durationMin;
  return activeOnDate(list, date).some((a) => {
    if (a.id === exceptId) return false;
    const b = blocks(a);
    return start < b.end && end + activeHours.bufferMin > b.start;
  });
}

export type Slot = { startMin: number; label: string };

export function freeSlots(
  list: Appointment[],
  date: string,
  durationMin: number,
  exceptId?: string,
): Slot[] {
  if (!isWorkday(date)) return [];
  const out: Slot[] = [];
  for (let t = activeHours.startMin; t + durationMin <= activeHours.endMin; t += SLOT) {
    if (!hasConflict(list, date, t, durationMin, exceptId)) {
      out.push({ startMin: t, label: formatTime(t) });
    }
  }
  return out;
}

export type Preference = "evening" | "morning" | "any";

export function clientPreference(client?: Client): Preference {
  const note = client?.note ?? "";
  if (note.includes("مسائ")) return "evening";
  if (note.includes("صباح")) return "morning";
  if (client?.kind === "org") return "morning";
  return "any";
}

export function preferenceLabel(prefer: Preference) {
  if (prefer === "evening") return "الفترة المسائية";
  if (prefer === "morning") return "الفترة الصباحية";
  return "أي وقت";
}

export function smartSuggest(
  list: Appointment[],
  date: string,
  durationMin: number,
  prefer: Preference,
  exceptId?: string,
  limit = 4,
): Slot[] {
  const slots = freeSlots(list, date, durationMin, exceptId);
  const scored = slots.map((s) => {
    let score = 0;
    if (prefer === "evening" && s.startMin >= 15 * 60) score += 5;
    if (prefer === "morning" && s.startMin < 12 * 60) score += 5;
    if (prefer === "any" && s.startMin >= 10 * 60 && s.startMin < 16 * 60) score += 2;
    const dayAppts = activeOnDate(list, date);
    const near = dayAppts.some((a) => {
      const end = a.startMin + a.durationMin;
      return Math.abs(s.startMin - end - activeHours.bufferMin) <= SLOT;
    });
    if (near) score += 3;
    if (s.startMin === 13 * 60) score -= 2;
    return { ...s, score };
  });
  scored.sort((a, b) => b.score - a.score || a.startMin - b.startMin);
  return scored.slice(0, limit);
}

export function gaps(list: Appointment[], date: string) {
  const day = activeOnDate(list, date)
    .slice()
    .sort((a, b) => a.startMin - b.startMin);
  const result: { startMin: number; minutes: number; label: string }[] = [];
  const { startMin: dayStart, endMin: dayEnd, bufferMin } = activeHours;
  let cursor = dayStart;
  for (const a of day) {
    const start = a.startMin;
    if (start - cursor >= SLOT) {
      const minutes = start - cursor;
      result.push({
        startMin: cursor,
        minutes,
        label: `${formatTime(cursor)} · ${minutes} د`,
      });
    }
    cursor = Math.max(cursor, a.startMin + a.durationMin + bufferMin);
  }
  if (dayEnd - cursor >= SLOT) {
    result.push({
      startMin: cursor,
      minutes: dayEnd - cursor,
      label: `${formatTime(cursor)} · ${dayEnd - cursor} د`,
    });
  }
  return result;
}

export type DayRow =
  | { type: "appt"; startMin: number; appt: Appointment }
  | { type: "gap"; startMin: number; minutes: number; label: string };

export function dayRows(list: Appointment[], date: string): DayRow[] {
  const items = activeOnDate(list, date)
    .slice()
    .sort((a, b) => a.startMin - b.startMin);
  const holes = gaps(list, date);
  const rows: DayRow[] = [
    ...items.map((appt) => ({ type: "appt" as const, startMin: appt.startMin, appt })),
    ...holes.map((h) => ({
      type: "gap" as const,
      startMin: h.startMin,
      minutes: h.minutes,
      label: h.label,
    })),
  ];
  rows.sort((a, b) => a.startMin - b.startMin);
  return rows;
}

export function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function minutesUntil(date: string, startMin: number) {
  const today = todayISO();
  if (date < today) return -Infinity;
  if (date > today) {
    const days = Math.round((parseDate(date).getTime() - parseDate(today).getTime()) / 86400000);
    return days * 24 * 60 + startMin - nowMinutes();
  }
  return startMin - nowMinutes();
}

export function formatCountdown(mins: number) {
  if (mins <= 0) return "الآن";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `خلال ${m} د`;
  if (m === 0) return `خلال ${h} س`;
  return `خلال ${h} س و ${m} د`;
}

export function upcoming(list: Appointment[]) {
  return list
    .filter((a) => !a.live && a.status === "confirmed")
    .map((a) => ({ a, eta: minutesUntil(a.date, a.startMin) }))
    .filter((x) => x.eta > -15)
    .sort((x, y) => x.eta - y.eta);
}

export function nextFor(list: Appointment[], clientId?: string) {
  return list
    .filter((a) => !a.live && a.status !== "cancelled" && (!clientId || a.clientId === clientId))
    .map((a) => ({ a, eta: minutesUntil(a.date, a.startMin) }))
    .filter((x) => x.eta > -15)
    .sort((x, y) => x.eta - y.eta)[0];
}
