import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  ChevronLeft,
  FileText,
  MoreHorizontal,
  Plus,
  Rocket,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveConsultBanner } from "@/components/live-consult-banner";
import { RequestComposer } from "@/components/request-composer";
import { StatusPill } from "@/components/status-pill";
import { Countdown } from "@/components/countdown";
import { clientById, useOffice } from "@/lib/store";
import { useMergedOffice } from "@/lib/office-live";
import { loadLaunch, type LaunchState } from "@/lib/launch";
import { todayISO } from "@/lib/schedule";

export const Route = createFileRoute("/office/")({
  component: OfficeHome,
});

function OfficeHome() {
  const { tasks, toggleTask } = useOffice();
  const { requests, appointments, clients, liveCount } = useMergedOffice();
  const [composing, setComposing] = useState(false);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const actioning = requests.filter((r) => r.status !== "done").slice(0, 4);
  const todayKey = todayISO();
  const today = appointments
    .filter((a) => !a.live && a.status !== "cancelled" && a.date === todayKey)
    .sort((a, b) => a.startMin - b.startMin);
  const pending = appointments.filter((a) => a.status === "pending").length;

  useEffect(() => {
    void loadLaunch()
      .then(setLaunch)
      .catch(() => {});
  }, []);

  const launchDone = launch
    ? [launch.hoursOk, launch.publicOk, launch.voiceOk, launch.videoOk, launch.remindersOn].filter(Boolean).length
    : 0;

  const kpis = [
    { label: "طلبات جديدة", value: String(requests.filter((r) => r.status !== "done").length), icon: FileText },
    { label: "قيد التنفيذ", value: String(requests.filter((r) => r.status !== "done" && r.status !== "pending-review").length), icon: FileText },
    { label: "مواعيد اليوم", value: String(today.length), icon: Calendar },
    { label: "بانتظار العميل", value: String(pending), icon: UserRound },
  ];
  const pipeline = [
    { label: "جديد", n: String(clients.length), icon: UserRound },
    { label: "تواصل أولي", n: String(requests.filter((r) => r.status === "pending-review" || r.status === "pending-confirm").length), icon: UserRound },
    { label: "عرض مرسل", n: "3", icon: FileText },
    { label: "تم التعاقد", n: "2", icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">صباح الخير، خالد</h1>
          <p className="text-sm text-muted">
            {liveCount
              ? `${liveCount} حجز من بوابة العميل يظهر في الجدول`
              : "أولويات المكتب اليوم"}
          </p>
        </div>
        <Button variant="forest" size="sm" onClick={() => setComposing((v) => !v)}>
          <Plus className="size-4" />
          إضافة طلب
        </Button>
      </div>

      {composing && (
        <RequestComposer
          onClose={() => setComposing(false)}
          onCreated={() => setComposing(false)}
        />
      )}

      {launch && launchDone < 5 && (
        <Link
          to="/office/launch"
          className="flex items-center gap-3 rounded-2xl border border-forest/15 bg-paper px-4 py-3 shadow-card"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-forest text-lime">
            <Rocket className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">تجهيز الإطلاق</div>
            <p className="text-xs text-muted">{launchDone} من 5 مسارات جاهزة — أكمل التثبيت قبل الاعتماد.</p>
          </div>
          <span className="text-xs font-medium text-forest">متابعة</span>
        </Link>
      )}

      {(() => {
        const portalLive = appointments.find((a) => a.fromPortal && a.kind === "video" && a.status === "confirmed");
        const name = portalLive
          ? clientById(portalLive.clientId, clients)?.name ?? "عميل البوابة"
          : "عبدالله";
        return (
          <LiveConsultBanner
            role="lawyer"
            name={name}
            roomId={portalLive?.id ?? "r1024"}
          />
        );
      })()}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <div className="text-sm text-muted">{k.label}</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{k.value}</div>
            </div>
            <span className="flex size-11 items-center justify-center rounded-full bg-ok/80 text-forest">
              <k.icon className="size-5" />
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">الطلبات التي تحتاج إجراء</h2>
            <Link to="/office/requests" className="text-xs text-muted hover:text-ink">
              عرض الكل
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">العميل</th>
                  <th className="py-2 font-medium">الخدمة</th>
                  <th className="py-2 font-medium">الحالة</th>
                  <th className="py-2 font-medium">المسؤول</th>
                  <th className="py-2 font-medium">الإجراء</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {actioning.map((r) => {
                  const c = clientById(r.clientId, clients);
                  return (
                    <tr key={r.id} className="border-b border-line/70 last:border-0">
                      <td className="py-3">
                        <Link
                          to="/office/clients/$clientId"
                          params={{ clientId: r.clientId }}
                          className="flex items-center gap-2"
                        >
                          {c?.avatar ? (
                            <img src={c.avatar} alt="" className="size-7 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-7 items-center justify-center rounded-full bg-cream text-xs">
                              <Building2 className="size-3.5" />
                            </span>
                          )}
                          {c?.name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted">{r.serviceLabel}</td>
                      <td className="py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-3 text-muted">{r.owner}</td>
                      <td className="py-3">
                        {r.video ? (
                          <Button asChild variant="lime" size="sm">
                            <Link to="/consult/$id" params={{ id: r.id }} search={{ as: "lawyer" }}>
                              بدء الاستشارة
                            </Link>
                          </Button>
                        ) : (
                          <span className="rounded-full bg-ok px-3 py-1 text-xs text-forest">
                            {r.actionLabel}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-muted">
                        <MoreHorizontal className="size-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">جدول اليوم</h2>
            <Link to="/office/appointments" className="text-xs text-muted">
              المواعيد الذكية
            </Link>
          </div>
          <ul className="space-y-2">
            {today.map((a) => {
              const c = clientById(a.clientId, clients);
              return (
                <li key={a.id}>
                  {a.kind === "video" ? (
                    <Link
                      to="/consult/$id"
                      params={{ id: a.requestId ?? "r1024" }}
                      search={{ as: "lawyer" }}
                      className="flex items-center gap-3 rounded-2xl border border-lime/20 bg-lime/10 px-3 py-3"
                    >
                      <span className="w-16 text-sm font-medium tabular-nums">{a.time}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="text-xs text-muted">{a.withLabel}</span>
                      </span>
                      <span className="text-xs text-forest">
                        غرفة مرئية · <Countdown date={a.date} startMin={a.startMin} />
                      </span>
                      <ChevronLeft className="size-4 text-muted" />
                    </Link>
                  ) : (
                    <Link
                      to="/office/clients/$clientId"
                      params={{ clientId: a.clientId }}
                      className="flex items-center gap-3 rounded-2xl border border-line px-3 py-3 hover:bg-cream/50"
                    >
                      <span className="w-16 text-sm tabular-nums text-muted">{a.time}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="text-xs text-muted">{a.withLabel}</span>
                      </span>
                      {c?.avatar && (
                        <img src={c.avatar} alt="" className="size-7 rounded-full object-cover" />
                      )}
                      <ChevronLeft className="size-4 text-muted" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">متابعة العملاء</h2>
            <Link to="/office/clients" className="text-xs text-muted">
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pipeline.map((p, i) => (
              <div
                key={p.label}
                className={`rounded-2xl px-3 py-4 text-center ${i === pipeline.length - 1 ? "bg-ok" : "bg-tile"}`}
              >
                <p.icon className="mx-auto size-4 text-forest" />
                <div className="mt-2 text-2xl font-semibold tabular-nums">{p.n}</div>
                <div className="text-xs text-muted">{p.label}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <h2 className="mb-3 font-semibold">مهام اليوم</h2>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1.5">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t.id)}
                    className="size-4 rounded border-line accent-forest"
                  />
                  <span className={`text-sm ${t.done ? "text-muted line-through" : ""}`}>
                    {t.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
