import { useEffect, useMemo, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { applyStoredOfficeHours } from "@/lib/office-hours-api";
import {
  formatDateLabel,
  formatTime,
  hasConflict,
  OFFICE_SEED_OCC,
  withinOfficeHours,
} from "@/lib/schedule";
import { useOffice } from "@/lib/store";
import type { Appointment, Client, LegalRequest, ServiceSlug } from "@/lib/types";
import { SERVICE_LABELS } from "@/lib/types";

export type LiveBooking = {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  date: string;
  startMin: number;
  durationMin: number;
  kind: Appointment["kind"];
  title: string;
  time: string;
  summary: string;
  status: Appointment["status"];
};

export function liveClientId(userId: string) {
  return `live-${userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
}

function asClient(b: LiveBooking): Client {
  return {
    id: liveClientId(b.userId),
    name: b.clientName || "عميل البوابة",
    kind: "person",
    city: "البوابة",
    phone: b.clientEmail,
    active: true,
    avatar: "",
    source: "بوابة العميل",
    owner: "خالد",
    note: b.summary,
    lastContact: "الآن",
  };
}

function asAppointment(b: LiveBooking): Appointment {
  return {
    id: b.id,
    clientId: liveClientId(b.userId),
    title: b.title,
    withLabel: `مع ${b.clientName || "عميل البوابة"}`,
    time: b.time,
    dateLabel: formatDateLabel(b.date),
    date: b.date,
    startMin: b.startMin,
    durationMin: b.durationMin,
    kind: b.kind,
    status: b.status,
    requestId: b.id,
    fromPortal: true,
  };
}

function asRequest(b: LiveBooking): LegalRequest {
  const service: ServiceSlug = b.kind === "review" ? "review" : "consult";
  return {
    id: b.id,
    number: `#${b.id.replace(/\D/g, "").slice(-4) || "بوابة"}`,
    clientId: liveClientId(b.userId),
    service,
    serviceLabel: SERVICE_LABELS[service],
    status: "confirmed",
    owner: "خالد",
    nextAction: "دخول الغرفة",
    actionLabel: "غرفة مرئية",
    video: b.kind === "video",
    createdAt: "البوابة",
  };
}

export async function isStaff(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from staff_users where user_id = ${userId}
  `;
  return rows.length > 0;
}

export const ensureOfficeSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ role: "staff" | "client" }> => {
    const sql = await getSql();
    if (await isStaff(context.userId)) return { role: "staff" };
    const counted = await sql<{ n: number }>`select count(*)::int as n from staff_users`;
    const n = Number(counted[0]?.n ?? 0);
    if (n === 0) {
      const user = await sql<{ name: string }>`
        select name from "user" where id = ${context.userId}
      `;
      await sql`
        insert into staff_users (user_id, name)
        values (${context.userId}, ${user[0]?.name ?? "المحامي"})
      `;
      return { role: "staff" };
    }
    return { role: "client" };
  });

export const listOfficeBookings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LiveBooking[]> => {
    if (!(await isStaff(context.userId))) return [];
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      date: string;
      start_min: number;
      duration_min: number;
      kind: string;
      status: string;
      title: string;
      summary: string | null;
      client_name: string | null;
      client_email: string | null;
    }>`
      select
        b.id,
        b.user_id,
        b.date,
        b.start_min,
        b.duration_min,
        b.kind,
        b.status,
        b.title,
        b.summary,
        u.name as client_name,
        u.email as client_email
      from client_bookings b
      left join "user" u on u.id = b.user_id
      where b.status <> 'cancelled'
      order by b.date asc, b.start_min asc
    `;
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      clientName: r.client_name ?? "عميل البوابة",
      clientEmail: r.client_email ?? "",
      date: r.date,
      startMin: r.start_min,
      durationMin: r.duration_min,
      kind: r.kind as LiveBooking["kind"],
      title: r.title,
      time: formatTime(r.start_min),
      summary: r.summary ?? "",
      status: (r.status === "pending" ? "pending" : "confirmed") as LiveBooking["status"],
    }));
  });

export const cancelOfficeBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!(await isStaff(context.userId))) return { ok: false };
    const id = data.id.slice(0, 64);
    const sql = await getSql();
    await sql`
      update client_bookings set status = 'cancelled'
      where id = ${id}
    `;
    return { ok: true };
  });

export const rescheduleOfficeBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; date: string; startMin: number }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    if (!(await isStaff(context.userId))) return { ok: false, error: "غير مصرح" };
    const id = data.id.slice(0, 64);
    const date = data.date.slice(0, 10);
    const startMin = Math.round(Number(data.startMin));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(startMin)) {
      return { ok: false, error: "بيانات غير صالحة" };
    }
    const sql = await getSql();
    const mine = await sql<{ duration_min: number }>`
      select duration_min from client_bookings where id = ${id} and status <> 'cancelled'
    `;
    if (!mine[0]) return { ok: false, error: "الموعد غير موجود" };
    const durationMin = mine[0].duration_min;
    await applyStoredOfficeHours();
    if (!withinOfficeHours(date, startMin, durationMin)) {
      return { ok: false, error: "هذا الوقت خارج ساعات عمل المكتب." };
    }
    const existing = await sql<{ date: string; start_min: number; duration_min: number }>`
      select date, start_min, duration_min from client_bookings
      where status <> 'cancelled' and id <> ${id}
    `;
    const taken: Appointment[] = [
      ...OFFICE_SEED_OCC.map((o, i) => ({
        id: `seed-${i}`,
        clientId: "seed",
        title: "",
        withLabel: "",
        time: "",
        dateLabel: "",
        date: o.date,
        startMin: o.startMin,
        durationMin: o.durationMin,
        kind: "video" as const,
        status: "confirmed" as const,
      })),
      ...existing.map((r, i) => ({
        id: `ex-${i}`,
        clientId: "ex",
        title: "",
        withLabel: "",
        time: "",
        dateLabel: "",
        date: r.date,
        startMin: r.start_min,
        durationMin: r.duration_min,
        kind: "video" as const,
        status: "confirmed" as const,
      })),
    ];
    if (hasConflict(taken, date, startMin, durationMin)) {
      return { ok: false, error: "هذا الوقت يتعارض مع موعد قائم." };
    }
    await sql`
      update client_bookings
      set date = ${date}, start_min = ${startMin}
      where id = ${id}
    `;
    return { ok: true };
  });


export function useMergedOffice() {
  const seed = useOffice();
  const [live, setLive] = useState<LiveBooking[]>([]);

  const refresh = () => {
    void listOfficeBookings()
      .then(setLive)
      .catch(() => setLive([]));
  };

  useEffect(() => {
    refresh();
    const tick = window.setInterval(refresh, 8000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return useMemo(() => {
    const liveClients = live.map(asClient);
    const liveAppts = live.map(asAppointment);
    const liveReqs = live.map(asRequest);
    const clientIds = new Set(liveClients.map((c) => c.id));
    const apptIds = new Set(liveAppts.map((a) => a.id));
    const reqIds = new Set(liveReqs.map((r) => r.id));
    return {
      liveCount: live.length,
      clients: [...liveClients, ...seed.clients.filter((c) => c.id !== "portal-self" && !clientIds.has(c.id))],
      appointments: [
        ...liveAppts,
        ...seed.appointments.filter((a) => a.clientId !== "portal-self" && !apptIds.has(a.id)),
      ],
      requests: [
        ...liveReqs,
        ...seed.requests.filter((r) => r.clientId !== "portal-self" && !reqIds.has(r.id)),
      ],
      refresh,
      cancelLive: async (id: string) => {
        await cancelOfficeBooking({ data: { id } });
        refresh();
      },
      rescheduleLive: async (id: string, date: string, startMin: number) => {
        const result = await rescheduleOfficeBooking({ data: { id, date, startMin } });
        refresh();
        return result;
      },
    };
  }, [live, seed.clients, seed.appointments, seed.requests]);
}
