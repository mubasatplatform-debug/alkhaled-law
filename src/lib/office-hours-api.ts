import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { DEFAULT_OFFICE_HOURS, normalizeOfficeHours, type OfficeHours } from "@/lib/office-hours";
import { getActiveOfficeHours, setActiveOfficeHours } from "@/lib/schedule";

/** The saved hours, or the defaults when the row is missing or unreadable. */
export async function loadOfficeHours(): Promise<OfficeHours> {
  try {
    const sql = await getSql();
    const rows = await sql<{
      work_days: number[];
      start_min: number;
      end_min: number;
      buffer_min: number;
    }>`select work_days, start_min, end_min, buffer_min from office_hours where id = 1`;
    const r = rows[0];
    if (!r) return DEFAULT_OFFICE_HOURS;
    const res = normalizeOfficeHours({
      workDays: r.work_days,
      startMin: r.start_min,
      endMin: r.end_min,
      bufferMin: r.buffer_min,
    });
    return res.ok ? res.hours : DEFAULT_OFFICE_HOURS;
  } catch {
    return DEFAULT_OFFICE_HOURS;
  }
}

/** Server side: make the scheduler use the saved hours for this request. */
export async function applyStoredOfficeHours(): Promise<OfficeHours> {
  const hours = await loadOfficeHours();
  setActiveOfficeHours(hours);
  return hours;
}

/** Public on purpose: the landing page and the booking flow show the hours. */
export const getOfficeHours = createServerFn({ method: "POST" }).handler(
  async (): Promise<OfficeHours> => loadOfficeHours(),
);

export const saveOfficeHours = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: OfficeHours) => input)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; hours: OfficeHours } | { ok: false; error: string }> => {
      const sql = await getSql();
      // Checked here rather than via office-live's isStaff, which imports this module.
      const staff = await sql`select 1 from staff_users where user_id = ${context.userId}`;
      if (staff.length === 0) return { ok: false, error: "تعديل الدوام للطاقم فقط." };
      const res = normalizeOfficeHours(data);
      if (!res.ok) return res;
      const h = res.hours;
      // An array literal string, cast in SQL, reads the same through pg and PGLite.
      const days = `{${h.workDays.join(",")}}`;
      await sql`
        insert into office_hours (id, work_days, start_min, end_min, buffer_min, updated_by, updated_at)
        values (1, ${days}::smallint[], ${h.startMin}, ${h.endMin}, ${h.bufferMin}, ${context.userId}, now())
        on conflict (id) do update set
          work_days = excluded.work_days,
          start_min = excluded.start_min,
          end_min = excluded.end_min,
          buffer_min = excluded.buffer_min,
          updated_by = excluded.updated_by,
          updated_at = now()
      `;
      setActiveOfficeHours(h);
      return { ok: true, hours: h };
    },
  );

// One request per page load, however many components ask.
let pending: Promise<OfficeHours> | null = null;

function fetchOfficeHours(): Promise<OfficeHours> {
  pending ??= getOfficeHours()
    .then((h) => {
      setActiveOfficeHours(h);
      return h;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}

/**
 * The office hours for rendering. Components that call the scheduler use this
 * so they re-render once the saved hours arrive instead of showing defaults.
 */
export function useOfficeHours() {
  const [hours, setHours] = useState<OfficeHours>(getActiveOfficeHours);

  useEffect(() => {
    let alive = true;
    void fetchOfficeHours()
      .then((h) => alive && setHours(h))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = async (next: OfficeHours) => {
    const res = await saveOfficeHours({ data: next });
    if (res.ok) {
      pending = Promise.resolve(res.hours);
      setActiveOfficeHours(res.hours);
      setHours(res.hours);
    }
    return res;
  };

  return { hours, save };
}
