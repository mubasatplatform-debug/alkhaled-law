import type { Appointment } from "./types.ts";

export const KIND_LABELS: Record<Appointment["kind"], string> = {
  video: "استشارة مرئية",
  review: "مراجعة",
  followup: "متابعة",
};

export interface BookingSummary {
  /** Bookings dated in the current month, cancelled ones included. */
  monthTotal: number;
  /** Not cancelled and dated today or later. */
  upcoming: number;
  /** Cancelled bookings this month. */
  cancelled: number;
  /** Active bookings this month, per kind, in a fixed display order. */
  byKind: { kind: Appointment["kind"]; label: string; n: number }[];
  /** The kind with the most active bookings this month, if any. */
  topKind: string | null;
}

/**
 * Only real bookings belong here. The office store also holds demo appointments
 * for the preview; counting them would show the lawyer invented numbers, which
 * is what the old hard-coded chart did.
 */
export function summarizeBookings(
  appointments: Pick<Appointment, "date" | "kind" | "status">[],
  today: string,
): BookingSummary {
  const month = today.slice(0, 7);
  const thisMonth = appointments.filter((a) => a.date.startsWith(month));
  const active = thisMonth.filter((a) => a.status !== "cancelled");

  const byKind = (Object.keys(KIND_LABELS) as Appointment["kind"][]).map((kind) => ({
    kind,
    label: KIND_LABELS[kind],
    n: active.filter((a) => a.kind === kind).length,
  }));
  const top = byKind.reduce((best, row) => (row.n > best.n ? row : best), byKind[0]);

  return {
    monthTotal: thisMonth.length,
    upcoming: appointments.filter((a) => a.status !== "cancelled" && a.date >= today).length,
    cancelled: thisMonth.length - active.length,
    byKind,
    topKind: top && top.n > 0 ? top.label : null,
  };
}
