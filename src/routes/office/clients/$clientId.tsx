import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Countdown } from "@/components/countdown";
import { LiveConsultBanner } from "@/components/live-consult-banner";
import { RequestComposer } from "@/components/request-composer";
import { StatusPill } from "@/components/status-pill";
import { clientById, useOffice } from "@/lib/store";
import { useMergedOffice } from "@/lib/office-live";
import {
  clientPreference,
  nextFor,
  preferenceLabel,
  smartSuggest,
  todayISO,
} from "@/lib/schedule";
import {
  DOC_STATUS,
  OFFER_STATUS,
  type Appointment,
} from "@/lib/types";

export const Route = createFileRoute("/office/clients/$clientId")({
  component: ClientFile,
});

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "requests", label: "الطلبات" },
  { id: "appointments", label: "المواعيد" },
  { id: "docs", label: "المستندات" },
  { id: "bills", label: "المدفوعات" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function ClientFile() {
  const { clientId } = Route.useParams();
  const {
    messages,
    documents,
    offers,
    updateClientNote,
    addAppointment,
    confirmSlot,
    cancelAppointment,
  } = useOffice();
  const { clients, requests, appointments, cancelLive } = useMergedOffice();
  const client = clientById(clientId, clients);
  const related = requests.filter((r) => r.clientId === clientId);
  const activity = messages.filter((m) => m.clientId === clientId);
  const mine = appointments.filter((a) => a.clientId === clientId && !a.live);
  const activeAppts = mine.filter((a) => a.status !== "cancelled");
  const docs = documents.filter((d) => d.clientId === clientId);
  const bills = offers.filter((o) => o.clientId === clientId);
  const next = nextFor(appointments, clientId);
  const [note, setNote] = useState(client?.note ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const [composing, setComposing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!client) {
    return <p className="text-muted">العميل غير موجود.</p>;
  }

  const videoReq = related.find((r) => r.video);
  const prefer = clientPreference(client);

  return (
    <div className="space-y-5">
      <div className="text-xs text-muted">
        <Link to="/office/clients" className="hover:text-ink">
          العملاء
        </Link>
        <span> / ملف العميل</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {client.avatar ? (
            <img src={client.avatar} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-lime/15 text-lime">
              <Building2 className="size-6" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{client.name}</h1>
              {client.active && <Badge tone="ok">عميل نشط</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {client.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" /> {client.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/office/messages">
              <MessageCircle className="size-4" />
              مراسلة العميل
            </Link>
          </Button>
          {videoReq && (
            <Button asChild variant="lime" size="sm">
              <Link to="/consult/$id" params={{ id: videoReq.id }} search={{ as: "lawyer" }}>
                <Video className="size-4" />
                استشارة مرئية
              </Link>
            </Button>
          )}
          <Button variant="forest" size="sm" onClick={() => setComposing(true)}>
            <Plus className="size-4" />
            إضافة طلب
          </Button>
        </div>
      </div>

      {videoReq && (
        <LiveConsultBanner role="lawyer" name={client.name} roomId={videoReq.id} />
      )}

      {composing && (
        <RequestComposer
          clientId={client.id}
          onClose={() => setComposing(false)}
          onCreated={() => {
            setComposing(false);
            setTab("requests");
          }}
        />
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2 text-sm ${
              tab === t.id ? "border-b-2 border-forest font-medium" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Kpi n={related.length} label="طلبات" />
              <Kpi n={activeAppts.length} label="مواعيد" />
              <Kpi n={docs.length} label="مستندات" />
            </div>
            <section className="rounded-3xl border border-line bg-card p-5">
              <h2 className="mb-3 font-semibold">سجل النشاط</h2>
              <ol className="relative space-y-4 border-r border-line pr-4">
                {docs[0] && (
                  <li>
                    <div className="text-sm">تم رفع {docs[0].name}</div>
                    <div className="text-xs text-muted">{docs[0].uploadedAt}</div>
                  </li>
                )}
                {activity.map((m) => (
                  <li key={m.id}>
                    <div className="text-sm">{m.text}</div>
                    <div className="text-xs text-muted">
                      {m.at} · {m.from === "lawyer" ? "خالد" : client.name}
                    </div>
                  </li>
                ))}
                {activity.length === 0 && !docs[0] && (
                  <li className="text-sm text-muted">لا نشاط بعد.</li>
                )}
              </ol>
            </section>
          </div>
          <div className="space-y-4">
            <NextCard
              next={next?.a}
              prefer={prefer}
              onConfirm={() => next && confirmSlot(next.a.id)}
              onBook={(date, startMin) =>
                addAppointment({
                  clientId: client.id,
                  kind: "followup",
                  date,
                  startMin,
                })
              }
              appointments={appointments}
            />
            {related[0] && (
              <section className="rounded-3xl border border-line bg-card p-5">
                <h2 className="mb-3 font-semibold">عرض الخدمة</h2>
                <div className="flex items-center justify-between rounded-2xl border border-line p-3">
                  <div>
                    <div className="text-sm font-medium">
                      {related[0].serviceLabel} {related[0].number}
                    </div>
                    <div className="mt-1">
                      <StatusPill status={related[0].status} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted"
                    onClick={() => setTab("requests")}
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </section>
            )}
            <section className="rounded-3xl border border-line bg-card p-5">
              <h2 className="mb-3 font-semibold">ملاحظة داخلية</h2>
              <p className="mb-2 text-xs text-muted">لا تظهر للعميل</p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted">{note.length}/300</span>
                <Button
                  size="sm"
                  variant="lime"
                  onClick={() => {
                    updateClientNote(client.id, note);
                    setSaved(true);
                  }}
                >
                  {saved ? "حُفظت" : "حفظ"}
                </Button>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "requests" && (
        <ul className="space-y-2">
          {related.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {r.serviceLabel} {r.number}
                </div>
                <div className="mt-1">
                  <StatusPill status={r.status} />
                </div>
              </div>
              <div className="text-xs text-muted">
                {r.owner} · {r.nextAction}
              </div>
              {r.video ? (
                <Button asChild variant="lime" size="sm">
                  <Link to="/consult/$id" params={{ id: r.id }} search={{ as: "lawyer" }}>
                    الغرفة المرئية
                  </Link>
                </Button>
              ) : (
                <span className="text-xs text-muted">{r.actionLabel}</span>
              )}
            </li>
          ))}
          {related.length === 0 && <Empty text="لا طلبات لهذا العميل." />}
        </ul>
      )}

      {tab === "appointments" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              يفضّل {preferenceLabel(prefer)} · الفاصل 15 د
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/office/appointments">المواعيد الذكية</Link>
            </Button>
          </div>
          <ul className="space-y-2">
            {activeAppts
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
              .map((a) => (
                <li
                  key={a.id}
                  className={`rounded-3xl border px-4 py-3 ${
                    a.kind === "video"
                      ? "border-lime/20 bg-lime/10"
                      : "border-line bg-card"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {a.time} · {a.title}
                      </div>
                      <div className="text-xs text-muted">
                        {a.dateLabel} · {a.durationMin} د ·{" "}
                        <Countdown date={a.date} startMin={a.startMin} />
                      </div>
                    </div>
                    <Badge tone={a.status === "pending" ? "warn" : "ok"}>
                      {a.status === "pending" ? "بانتظار التأكيد" : "مؤكد"}
                    </Badge>
                    {a.status === "pending" && (
                      <Button size="sm" variant="forest" onClick={() => confirmSlot(a.id)}>
                        تأكيد
                      </Button>
                    )}
                    {a.kind === "video" && a.status === "confirmed" && (
                      <Button asChild size="sm" variant="lime">
                        <Link
                          to="/consult/$id"
                          params={{ id: a.requestId ?? a.id }}
                          search={{ as: "lawyer" }}
                        >
                          الغرفة
                        </Link>
                      </Button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-muted"
                      onClick={() => {
                        if (a.fromPortal) void cancelLive(a.id);
                        else cancelAppointment(a.id);
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </li>
              ))}
          </ul>
          {activeAppts.length === 0 && <Empty text="لا مواعيد. اقترح وقتاً أدناه." />}
        </div>
      )}

      {tab === "docs" && (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3"
            >
              <FileText className="size-5 text-forest" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted">{d.uploadedAt}</div>
              </div>
              <Badge tone={DOC_STATUS[d.status].tone}>{DOC_STATUS[d.status].label}</Badge>
            </li>
          ))}
          {docs.length === 0 && <Empty text="لا مستندات في الملف." />}
        </ul>
      )}

      {tab === "bills" && (
        <ul className="space-y-2">
          {bills.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-3xl border border-line bg-card px-4 py-3"
            >
              <Receipt className="size-5 text-forest" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{o.title}</div>
                <div className="text-xs text-muted">{o.number}</div>
              </div>
              <div className="text-sm tabular-nums">{o.amount}</div>
              <Badge tone={OFFER_STATUS[o.status].tone}>{OFFER_STATUS[o.status].label}</Badge>
            </li>
          ))}
          {bills.length === 0 && <Empty text="لا عروض أو فواتير." />}
        </ul>
      )}

      <footer className="flex flex-wrap gap-6 border-t border-line pt-4 text-xs text-muted">
        <span>
          آخر تواصل
          <strong className="ms-2 text-ink">{client.lastContact}</strong>
        </span>
        <span>
          المسؤول
          <strong className="ms-2 text-ink">{client.owner}</strong>
        </span>
        <span>
          مصدر العميل
          <strong className="ms-2 text-ink">{client.source}</strong>
        </span>
      </footer>
    </div>
  );
}

function Kpi({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-tile px-3 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums">{n}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-3xl border border-line bg-card px-4 py-8 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function NextCard({
  next,
  prefer,
  onConfirm,
  onBook,
  appointments,
}: {
  next?: Appointment;
  prefer: ReturnType<typeof clientPreference>;
  onConfirm: () => void;
  onBook: (date: string, startMin: number) => void;
  appointments: Appointment[];
}) {
  const suggestions = next ? [] : smartSuggest(appointments, todayISO(), 30, prefer);
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="mb-3 font-semibold">المتابعة القادمة</h2>
      {next ? (
        <div
          className={`rounded-2xl border p-3 ${
            next.kind === "video" ? "border-lime/20 bg-lime/10" : "border-line"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {next.kind === "video" && <Video className="size-4" />}
            {next.title}
          </div>
          <div className="mt-1 text-xs text-muted">
            {next.dateLabel} · {next.time} · <Countdown date={next.date} startMin={next.startMin} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {next.status === "pending" && (
              <Button size="sm" variant="forest" onClick={onConfirm}>
                تثبيت الموعد
              </Button>
            )}
            {next.kind === "video" && next.status === "confirmed" && (
              <Button asChild size="sm" variant="lime">
                <Link
                  to="/consult/$id"
                  params={{ id: next.requestId ?? next.id }}
                  search={{ as: "lawyer" }}
                >
                  دخول الغرفة
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted">
            لا موعد قادم. اقتراح حسب التفضيل ({preferenceLabel(prefer)}):
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.startMin}
                type="button"
                onClick={() => onBook(todayISO(), s.startMin)}
                className="rounded-full bg-lime px-3 py-1.5 text-xs font-medium text-paper"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <Link
        to="/office/appointments"
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl bg-lime py-3 text-sm font-medium text-paper"
      >
        <Calendar className="size-4" />
        + إضافة متابعة
      </Link>
    </section>
  );
}
