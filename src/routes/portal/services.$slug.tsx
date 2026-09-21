import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_META, type ServiceSlug } from "@/lib/types";
import { useOfficeHours } from "@/lib/office-hours-api";
import { useOffice } from "@/lib/store";
import {
  todayISO,
  addDays,
  clientPreference,
  dayName,
  durationFor,
  formatDateLabel,
  smartSuggest,
} from "@/lib/schedule";

export const Route = createFileRoute("/portal/services/$slug")({
  component: ServicePage,
});

function ServicePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { addIntake, addRequest, addAppointment, appointments, clients } = useOffice();
  // Re-renders the day and slot pickers once the saved hours load.
  useOfficeHours();
  const key = (["consult", "review", "draft", "case"].includes(slug)
    ? slug
    : "consult") as ServiceSlug;
  const meta = SERVICE_META[key];
  const isConsult = key === "consult";
  const client = clients.find((c) => c.id === "abdullah");
  const prefer = clientPreference(client);
  const duration = durationFor(isConsult ? "video" : "review");

  const days = useMemo(() => {
    const out: string[] = [];
    let guard = 0;
    while (out.length < 4 && guard < 14) {
      const iso = addDays(todayISO(), guard);
      guard += 1;
      if (smartSuggest(appointments, iso, duration, prefer).length) out.push(iso);
    }
    return out;
  }, [appointments, duration, prefer]);

  const [day, setDay] = useState(days[0] ?? todayISO());
  const [startMin, setStartMin] = useState<number | null>(null);
  const [channel, setChannel] = useState<"video" | "voice">("video");
  const slots = smartSuggest(appointments, day, duration, prefer);

  const book = () => {
    if (isConsult && startMin != null) {
      const id = addRequest({ clientId: "abdullah", service: "consult" });
      addAppointment({
        clientId: "abdullah",
        kind: "video",
        date: day,
        startMin,
        status: "pending",
        requestId: id,
      });
      void navigate({ to: "/portal/appointments" });
      return;
    }
    const id = addIntake({
      name: "عبدالله",
      phone: "+966 5X XXX XX12",
      service: key,
      summary: isConsult ? "استشارة مرئية محجوزة من البوابة" : "طلب خدمة من البوابة",
    });
    if (isConsult) {
      void navigate({ to: "/consult/$id", params: { id }, search: { as: "client" } });
    } else {
      void navigate({ to: "/portal/requests" });
    }
  };

  return (
    <div>
      <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowRight className="size-4" />
        الخدمات القانونية
      </Link>
      <p className="mt-4 text-sm text-muted">{meta.title}</p>
      <h1 className="text-3xl font-semibold leading-tight">
        {isConsult ? "استشارة قانونية" : "وقّع بوضوح."}
      </h1>
      <p className="mt-2 text-sm text-muted">{meta.blurb}</p>

      <div className="mt-5 overflow-hidden rounded-3xl">
        <img
          src={isConsult ? "/images/hero.jpg" : "/images/contract.jpg"}
          alt=""
          className="aspect-video w-full object-cover"
        />
      </div>

      {isConsult ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-muted">ناقش موضوعك وحدد خطوتك القادمة — الغرفة داخل النظام.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel("video")}
              className={`rounded-2xl border px-3 py-3 text-sm ${
                channel === "video" ? "border-forest bg-ok/50" : "border-line bg-card"
              }`}
            >
              <Video className="mb-1 size-4" />
              عبر الغرفة المرئية
            </button>
            <button
              type="button"
              onClick={() => setChannel("voice")}
              className={`rounded-2xl border px-3 py-3 text-sm ${
                channel === "voice" ? "border-forest bg-ok/50" : "border-line bg-card"
              }`}
            >
              <Clock className="mb-1 size-4" />
              {meta.minutes} دقيقة
            </button>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">اختر موعدك</div>
            <div className="grid grid-cols-4 gap-2">
              {days.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setDay(iso);
                    setStartMin(null);
                  }}
                  className={`rounded-2xl py-3 text-center ${
                    iso === day ? "bg-forest text-paper" : "bg-card border border-line"
                  }`}
                >
                  <div className="text-xs opacity-70">{dayName(iso)}</div>
                  <div className="text-lg font-semibold tabular-nums">{iso.slice(8)}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s.startMin}
                  type="button"
                  onClick={() => setStartMin(s.startMin)}
                  className={`rounded-2xl px-3 py-3 text-sm ${
                    startMin === s.startMin
                      ? "bg-lime text-paper"
                      : "border border-line bg-card"
                  }`}
                >
                  <Clock className="mb-1 size-4" />
                  {s.label}
                </button>
              ))}
              {slots.length === 0 && (
                <p className="text-sm text-muted">لا خانات هذا اليوم.</p>
              )}
            </div>
          </div>
          <Button
            variant="lime"
            className="w-full"
            size="lg"
            disabled={startMin == null}
            onClick={book}
          >
            <ArrowLeft className="size-4" />
            احجز الموعد
          </Button>
          <p className="text-center text-xs text-muted">
            يُقترح عليك {formatDateLabel(day)} حسب تفضيلك. الموعد يصل بانتظار تأكيد المكتب.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ol className="space-y-3">
            {[
              ["تحليل البنود", "دراسة دقيقة لبنود العقد"],
              ["توضيح الالتزامات", "بيان الحقوق والالتزامات"],
              ["تقرير بالملاحظات", "تقرير شامل ومهني"],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-lime text-sm font-medium text-paper">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-muted">{d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-3xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-muted">
            اسحب الملف هنا أو اختر ملفاً
            <div className="mt-1 text-xs">Word أو PDF</div>
          </div>
          <Button variant="lime" className="w-full" size="lg" onClick={book}>
            <ArrowLeft className="size-4" />
            طلب مراجعة
          </Button>
        </div>
      )}
    </div>
  );
}
