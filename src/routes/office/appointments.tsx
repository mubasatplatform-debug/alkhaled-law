import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/countdown";
import { clientById, useOffice } from "@/lib/store";
import { useMergedOffice } from "@/lib/office-live";
import type { Appointment, Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  SLOT,
  TODAY,
  WORK_END,
  WORK_START,
  activeOnDate,
  addDays,
  clientPreference,
  dayName,
  dayRows,
  durationFor,
  formatDateLabel,
  formatHour,
  formatTime,
  freeSlots,
  gaps,
  hasConflict,
  isWorkday,
  minutesUntil,
  preferenceLabel,
  smartSuggest,
  startOfWeek,
  upcoming,
  weekDays,
} from "@/lib/schedule";

export const Route = createFileRoute("/office/appointments")({
  component: AppointmentsPage,
});

const SLOT_COUNT = (WORK_END - WORK_START) / SLOT;
const DAY_SPAN = WORK_END - WORK_START;

function AppointmentsPage() {
  const {
    addAppointment,
    cancelAppointment,
    confirmSlot,
  } = useOffice();
  const { appointments, clients, cancelLive, rescheduleLive } = useMergedOffice();
  const [selected, setSelected] = useState(TODAY);
  const [focus, setFocus] = useState<string | null>(null);
  const [composer, setComposer] = useState<"off" | "create" | "move">("off");
  const [slotMin, setSlotMin] = useState<number | null>(null);

  const week = weekDays(selected);
  const dayItems = activeOnDate(appointments, selected).sort(
    (a, b) => a.startMin - b.startMin,
  );
  const rows = dayRows(appointments, selected);
  const pending = appointments.filter((a) => a.status === "pending");
  const next = upcoming(appointments)[0];
  const dayGaps = gaps(appointments, selected);
  const focused = appointments.find((a) => a.id === focus && !a.live);

  const openCreate = (start?: number) => {
    setComposer("create");
    setFocus(null);
    setSlotMin(start ?? null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">المواعيد الذكية</h1>
          <p className="text-sm text-muted">
            الأوقات تُقترح حسب التفضيل والتعارض والفجوات — والاستشارة المرئية تبقى داخل النظام.
          </p>
        </div>
        <Button variant="forest" size="sm" onClick={() => openCreate()}>
          <Plus className="size-4" />
          موعد جديد
        </Button>
      </div>

      {next && <NextBanner next={next.a} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Insight
          label="مواعيد اليوم"
          value={String(dayItems.length)}
          hint={formatDateLabel(selected)}
        />
        <Insight
          label="بانتظار التأكيد"
          value={String(pending.length)}
          hint={pending[0] ? pending[0].withLabel : "لا يوجد"}
        />
        <Insight
          label="فجوات قابلة للحجز"
          value={String(dayGaps.length)}
          hint={dayGaps[0]?.label ?? "اليوم ممتلئ"}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full hover:bg-paper"
          onClick={() => setSelected(addDays(startOfWeek(selected), -7))}
          aria-label="الأسبوع السابق"
        >
          <ChevronRight className="size-5" />
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1">
          {week.map((iso) => {
            const count = activeOnDate(appointments, iso).length;
            const work = isWorkday(iso);
            const on = iso === selected;
            const hasPending = appointments.some(
              (a) => a.date === iso && a.status === "pending",
            );
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelected(iso);
                  setComposer("off");
                  setFocus(null);
                }}
                className={cn(
                  "rounded-2xl px-1 py-2 text-center",
                  on
                    ? "bg-forest text-paper"
                    : work
                      ? "border border-line bg-card hover:border-forest/30"
                      : "bg-cream text-muted",
                )}
              >
                <div className="text-xs opacity-70">{dayName(iso).slice(0, 3)}</div>
                <div className="text-sm font-semibold tabular-nums">{iso.slice(8)}</div>
                {count > 0 && (
                  <div
                    className={cn(
                      "mx-auto mt-1 size-1.5 rounded-full",
                      on ? "bg-lime" : hasPending ? "bg-warn" : "bg-forest",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full hover:bg-paper"
          onClick={() => setSelected(addDays(startOfWeek(selected), 7))}
          aria-label="الأسبوع التالي"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      {!isWorkday(selected) ? (
        <p className="rounded-3xl border border-line bg-card px-4 py-8 text-center text-sm text-muted">
          عطلة المكتب. الأحد–الخميس من 9 ص إلى 5 م.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_20rem]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-semibold">{formatDateLabel(selected)}</h2>
              <span className="text-xs text-muted">خانات 30 د · فاصل 15 د</span>
            </header>
            <div className="space-y-4 p-4">
              <DayRuler
                items={dayItems}
                focusId={focus}
                onSelect={(id) => {
                  setFocus(id);
                  setComposer("off");
                }}
                onEmpty={(t) => openCreate(t)}
              />
              <ul className="space-y-2">
                {rows.map((row) =>
                  row.type === "gap" ? (
                    <li key={`gap-${row.startMin}`}>
                      <button
                        type="button"
                        onClick={() => openCreate(row.startMin)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3 text-right hover:border-forest/40 hover:bg-cream/60"
                      >
                        <span className="w-16 shrink-0 text-xs tabular-nums text-muted">
                          {formatTime(row.startMin)}
                        </span>
                        <span className="flex-1 text-sm text-muted">
                          فجوة {row.minutes} د — متاح للحجز
                        </span>
                        <span className="text-xs text-forest">حجز</span>
                      </button>
                    </li>
                  ) : (
                    <AgendaCard
                      key={row.appt.id}
                      appt={row.appt}
                      client={clientById(row.appt.clientId, clients)}
                      active={focus === row.appt.id}
                      onSelect={() => {
                        setFocus(row.appt.id);
                        setComposer("off");
                      }}
                    />
                  ),
                )}
              </ul>
            </div>
          </section>

          <aside className="space-y-3">
            {composer !== "off" ? (
              <Composer
                key={`${composer}-${slotMin ?? "x"}-${focused?.id ?? ""}`}
                mode={composer}
                date={selected}
                moving={composer === "move" ? focused : undefined}
                presetStart={composer === "create" ? slotMin : null}
                calendar={appointments}
                onClose={() => setComposer("off")}
                onCreated={(id) => {
                  setComposer("off");
                  setFocus(id);
                }}
                onRescheduleLive={async (id, day, start) => {
                  const result = await rescheduleLive(id, day, start);
                  if (!result.ok) throw new Error(result.error ?? "تعذّر النقل");
                }}
              />
            ) : focused ? (
              <Detail
                appt={focused}
                onMove={() => setComposer("move")}
                onClose={() => setFocus(null)}
                onCancel={() => {
                  if (focused.fromPortal) void cancelLive(focused.id);
                  else cancelAppointment(focused.id);
                  setFocus(null);
                }}
                onConfirm={() => confirmSlot(focused.id)}
              />
            ) : (
              <SmartPanel
                date={selected}
                appointments={appointments}
                clients={clients}
                gaps={dayGaps}
                onPickCreate={() => openCreate()}
                addAppointment={addAppointment}
              />
            )}

            {pending.length > 0 && (
              <div className="rounded-3xl border border-line bg-card p-4">
                <h3 className="text-sm font-semibold">بانتظار تأكيدك</h3>
                <ul className="mt-3 space-y-2">
                  {pending.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{a.withLabel}</div>
                        <div className="text-xs text-muted">
                          {a.dateLabel} · {a.time}
                        </div>
                      </div>
                      <Button size="sm" variant="lime" onClick={() => confirmSlot(a.id)}>
                        تأكيد
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Insight({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </div>
  );
}

function NextBanner({ next }: { next: Appointment }) {
  const soon = minutesUntil(next.date, next.startMin) <= 30;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3",
        soon ? "border border-lime/20 bg-lime/10" : "border border-line bg-card",
      )}
    >
      <Clock className="size-4 text-forest" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {next.kind === "video" ? "أقرب استشارة مرئية" : "الموعد التالي"}
        </div>
        <div className="text-xs text-muted">
          {next.title} {next.withLabel} · {next.time} ·{" "}
          <Countdown date={next.date} startMin={next.startMin} />
        </div>
      </div>
      {next.kind === "video" && (
        <Button asChild variant="forest" size="sm">
          <Link to="/consult/$id" params={{ id: next.requestId ?? "r1024" }} search={{ as: "lawyer" }}>
            <Video className="size-4" />
            دخول الغرفة
          </Link>
        </Button>
      )}
    </div>
  );
}

function DayRuler({
  items,
  focusId,
  onSelect,
  onEmpty,
}: {
  items: Appointment[];
  focusId: string | null;
  onSelect: (id: string) => void;
  onEmpty: (startMin: number) => void;
}) {
  const hours = Array.from({ length: 8 }, (_, i) => WORK_START + i * 60);
  return (
    <div>
      <div className="mb-1 grid grid-cols-8 text-xs text-muted">
        {hours.map((t) => (
          <div key={t} className="tabular-nums">
            {formatHour(t)}
          </div>
        ))}
      </div>
      <div className="relative h-12 overflow-hidden rounded-2xl bg-cream">
        {Array.from({ length: SLOT_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={formatTime(WORK_START + i * SLOT)}
            onClick={() => onEmpty(WORK_START + i * SLOT)}
            className="absolute top-0 h-full hover:bg-forest/10"
            style={{
              insetInlineStart: `${((i * SLOT) / DAY_SPAN) * 100}%`,
              width: `${(SLOT / DAY_SPAN) * 100}%`,
            }}
          />
        ))}
        {items.map((a) => {
          const video = a.kind === "video";
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              title={`${a.time} ${a.title} ${a.withLabel}`}
              style={{
                insetInlineStart: `${((a.startMin - WORK_START) / DAY_SPAN) * 100}%`,
                width: `${(a.durationMin / DAY_SPAN) * 100}%`,
              }}
              className={cn(
                "absolute top-1 bottom-1 z-10 flex items-center justify-center gap-1 overflow-hidden rounded-lg px-1 text-xs font-medium",
                focusId === a.id ? "ring-2 ring-ink" : "",
                video
                  ? "bg-lime text-paper"
                  : a.status === "pending"
                    ? "bg-warn text-ink"
                    : "bg-forest text-paper",
              )}
            >
              {video && <Video className="size-3.5 shrink-0" />}
              <span className="hidden truncate sm:inline">{a.withLabel.replace("مع ", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgendaCard({
  appt,
  client,
  active,
  onSelect,
}: {
  appt: Appointment;
  client?: Client;
  active: boolean;
  onSelect: () => void;
}) {
  const video = appt.kind === "video";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-right",
          video
            ? "border-lime/20 bg-lime/10"
            : appt.status === "pending"
              ? "border-warn bg-warn/60"
              : "border-line bg-ok/50",
          active && "ring-2 ring-forest",
        )}
      >
        <span className="w-16 shrink-0 text-sm font-medium tabular-nums">{appt.time}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {video && <Video className="size-3.5" />}
            {appt.title}
          </span>
          <span className="text-xs text-muted">
            {appt.withLabel} · {appt.durationMin} د
            {appt.fromPortal ? " · من البوابة" : ""}
            {appt.status === "pending" ? " · بانتظار التأكيد" : ""}
          </span>
        </span>
        {video && (
          <span className="hidden text-xs text-forest sm:inline">
            <Countdown date={appt.date} startMin={appt.startMin} />
          </span>
        )}
        {client?.avatar ? (
          <img src={client.avatar} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-cream text-xs">
            {client?.name.slice(0, 1)}
          </span>
        )}
      </button>
    </li>
  );
}

function Detail({
  appt,
  onMove,
  onClose,
  onCancel,
  onConfirm,
}: {
  appt: Appointment;
  onMove: () => void;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{appt.title}</h3>
          <p className="text-sm text-muted">{appt.withLabel}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق">
          <X className="size-4 text-muted" />
        </button>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <div>
          {appt.dateLabel} · {appt.time}
        </div>
        <div className="text-muted">
          {appt.durationMin} دقيقة · <Countdown date={appt.date} startMin={appt.startMin} />
        </div>
        <Badge tone={appt.status === "pending" ? "warn" : "ok"}>
          {appt.status === "pending" ? "بانتظار التأكيد" : "مؤكد"}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {appt.kind === "video" && (
          <Button asChild variant="lime" size="sm">
            <Link
              to="/consult/$id"
              params={{ id: appt.requestId ?? "r1024" }}
              search={{ as: "lawyer" }}
            >
              <Video className="size-4" />
              الغرفة المرئية
            </Link>
          </Button>
        )}
        {appt.status === "pending" && (
          <Button variant="forest" size="sm" onClick={onConfirm}>
            تأكيد
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onMove}>
          إعادة جدولة
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

function SmartPanel({
  date,
  appointments,
  clients,
  gaps: dayGaps,
  onPickCreate,
  addAppointment,
}: {
  date: string;
  appointments: Appointment[];
  clients: Client[];
  gaps: { startMin: number; minutes: number; label: string }[];
  onPickCreate: () => void;
  addAppointment: (input: {
    clientId: string;
    kind: Appointment["kind"];
    date: string;
    startMin: number;
  }) => string;
}) {
  const evening = smartSuggest(appointments, date, 30, "evening");
  const morning = smartSuggest(appointments, date, 30, "morning");
  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-forest" />
        <h3 className="text-sm font-semibold">اقتراحات ذكية</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        عبدالله يفضّل المساء، مؤسسة النخيل تفضّل الصباح. الفاصل 15 د بين الجلسات.
      </p>
      <div className="mt-3">
        <div className="text-xs text-muted">مساءً — لعبدالله</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {evening.length === 0 && <span className="text-xs text-muted">لا خانات</span>}
          {evening.map((s) => (
            <button
              key={s.startMin}
              type="button"
              onClick={() =>
                addAppointment({
                  clientId: "abdullah",
                  kind: "video",
                  date,
                  startMin: s.startMin,
                })
              }
              className="rounded-full bg-lime px-3 py-1 text-xs font-medium text-paper"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-xs text-muted">صباحاً — للمنشآت</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {morning.map((s) => (
            <button
              key={s.startMin}
              type="button"
              onClick={() =>
                addAppointment({
                  clientId: "nakheel",
                  kind: "review",
                  date,
                  startMin: s.startMin,
                })
              }
              className="rounded-full bg-ok px-3 py-1 text-xs font-medium"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {dayGaps.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          أكبر فجوة اليوم: {dayGaps.slice().sort((a, b) => b.minutes - a.minutes)[0]?.label}
        </p>
      )}
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onPickCreate}>
        موعد مخصص
      </Button>
    </div>
  );
}

function Composer({
  mode,
  date,
  moving,
  presetStart,
  calendar,
  onClose,
  onCreated,
  onRescheduleLive,
}: {
  mode: "create" | "move";
  date: string;
  moving?: Appointment;
  presetStart: number | null;
  calendar: Appointment[];
  onClose: () => void;
  onCreated: (id: string) => void;
  onRescheduleLive: (id: string, date: string, startMin: number) => Promise<void>;
}) {
  const { clients, addAppointment, rescheduleAppointment } = useOffice();
  const [clientId, setClientId] = useState(moving?.clientId ?? clients[0]?.id ?? "abdullah");
  const [kind, setKind] = useState<Appointment["kind"]>(moving?.kind ?? "video");
  const [day, setDay] = useState(moving?.date ?? date);
  const [error, setError] = useState<string | null>(null);
  const duration = moving?.durationMin ?? durationFor(kind);
  const client = clientById(clientId, clients);
  const prefer = clientPreference(client);
  const suggestions = useMemo(
    () => smartSuggest(calendar, day, duration, prefer, moving?.id),
    [calendar, day, duration, prefer, moving?.id],
  );
  const allSlots = freeSlots(calendar, day, duration, moving?.id);
  const presetOk =
    presetStart != null &&
    !hasConflict(calendar, day, presetStart, duration, moving?.id);

  const pick = (startMin: number) => {
    if (hasConflict(calendar, day, startMin, duration, moving?.id)) {
      setError("هذا الوقت يتعارض مع موعد قائم أو مع فاصل 15 د.");
      return;
    }
    if (mode === "move" && moving) {
      if (moving.fromPortal) {
        void onRescheduleLive(moving.id, day, startMin)
          .then(() => onCreated(moving.id))
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "تعذّر نقل الموعد.");
          });
        return;
      }
      rescheduleAppointment(moving.id, day, startMin);
      onCreated(moving.id);
      return;
    }
    const id = addAppointment({ clientId, kind, date: day, startMin, durationMin: duration });
    if (!id) {
      setError("تعذّر الحجز بسبب تعارض.");
      return;
    }
    onCreated(id);
  };

  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {mode === "move" ? "إعادة الجدولة" : "موعد جديد"}
        </h3>
        <button type="button" onClick={onClose} aria-label="إغلاق">
          <X className="size-4 text-muted" />
        </button>
      </div>
      {mode === "create" && (
        <div className="mt-3 space-y-2">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Appointment["kind"])}
            className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
          >
            <option value="video">استشارة مرئية — 30 د</option>
            <option value="review">مراجعة عقد — 45 د</option>
            <option value="followup">متابعة — 30 د</option>
          </select>
        </div>
      )}
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {weekDays(day).map((iso) => (
          <button
            key={iso}
            type="button"
            disabled={!isWorkday(iso)}
            onClick={() => setDay(iso)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs",
              iso === day ? "bg-forest text-paper" : "bg-cream text-muted",
              "disabled:opacity-40",
            )}
          >
            {dayName(iso).slice(0, 3)} {iso.slice(8)}
          </button>
        ))}
      </div>
      {presetStart != null && (
        <div className="mt-3">
          {presetOk ? (
            <Button variant="lime" size="sm" className="w-full" onClick={() => pick(presetStart)}>
              تأكيد {formatTime(presetStart)}
            </Button>
          ) : (
            <p className="text-xs text-danger">هذا الوقت يتعارض — اختر من المقترحات.</p>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        مقترح لـ {client?.name} ({preferenceLabel(prefer)})
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.startMin}
            type="button"
            onClick={() => pick(s.startMin)}
            className="rounded-full bg-lime px-3 py-1.5 text-xs font-medium text-paper"
          >
            {s.label}
          </button>
        ))}
        {suggestions.length === 0 && (
          <span className="text-xs text-muted">لا اقتراح لهذا اليوم</span>
        )}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted">كل الأوقات المتاحة</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allSlots.map((s) => (
            <button
              key={s.startMin}
              type="button"
              onClick={() => pick(s.startMin)}
              className="rounded-full border border-line px-2.5 py-1 text-xs"
            >
              {s.label}
            </button>
          ))}
        </div>
      </details>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
