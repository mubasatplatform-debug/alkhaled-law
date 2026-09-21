import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Clock, LogIn, Mic, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeDb } from "@/lib/db-readiness";
import { describeOfficeHours } from "@/lib/office-hours";
import { useOfficeHours } from "@/lib/office-hours-api";
import { getInfraReadiness, type InfraReadiness } from "@/lib/infra-readiness";
import { loadLaunch, saveLaunch, type LaunchState } from "@/lib/launch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/office/launch")({
  component: LaunchPage,
});

const STEPS: {
  key: keyof LaunchState;
  n: string;
  title: string;
  body: string;
  action: string;
  href?: string;
}[] = [
  {
    key: "hoursOk",
    n: "01",
    title: "ساعات العمل",
    // Replaced at render time with the saved hours.
    body: "",
    action: "تأكيد الساعات",
  },
  {
    key: "publicOk",
    n: "02",
    title: "مسار دخول العميل",
    body: "Google أو البريد. بعد الدخول يفتح المساعد ويحجز من نفس المحادثة.",
    action: "مراجعة صفحة الدخول",
    href: "/login",
  },
  {
    key: "voiceOk",
    n: "03",
    title: "المساعد الصوتي",
    body: "العميل يكتب أو يسجّل صوته. المساعد يفرّغ الكلام ويستشير ويحجز.",
    action: "تجربة المساعد",
    href: "/portal",
  },
  {
    key: "videoOk",
    n: "04",
    title: "الغرفة المرئية",
    body: "الجلسة داخل النظام بين جوال العميل وحاسوب المكتب — دون زووم.",
    action: "تجربة الغرفة",
    href: "/consult/r1024?as=lawyer",
  },
  {
    key: "remindersOn",
    n: "05",
    title: "تذكير المواعيد",
    body: "يظهر تذكير في البوابة ولوحة المكتب قبل الموعد بساعتين.",
    action: "تفعيل التذكير",
  },
];

function LaunchPage() {
  const [state, setState] = useState<LaunchState | null>(null);
  const [busy, setBusy] = useState<keyof LaunchState | null>(null);
  const [infra, setInfra] = useState<InfraReadiness | null>(null);
  const { hours } = useOfficeHours();

  useEffect(() => {
    void loadLaunch()
      .then(setState)
      .catch(() =>
        setState({
          hoursOk: false,
          publicOk: false,
          voiceOk: false,
          videoOk: false,
          remindersOn: false,
        }),
      );
  }, []);

  useEffect(() => {
    // Best effort: a failed probe must not hide the checklist itself.
    void getInfraReadiness().then(setInfra).catch(() => setInfra(null));
  }, []);

  const toggle = async (key: keyof LaunchState) => {
    if (!state || busy) return;
    setBusy(key);
    try {
      const next = await saveLaunch({ data: { [key]: !state[key] } });
      setState(next);
    } catch {
      /* keep */
    } finally {
      setBusy(null);
    }
  };

  const done = state ? STEPS.filter((s) => state[s.key]).length : 0;
  const ready = done === STEPS.length;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-sm font-medium text-forest">مسار الإطلاق</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <Rocket className="size-6 text-forest" />
          تجهيز المكتب للتشغيل
        </h1>
        <p className="mt-2 text-sm text-muted">
          خمسة مسارات قبل الاعتماد النهائي. ثبّت كل خطوة بعد تجربتها.
        </p>
      </div>

      {infra && (() => {
        const db = describeDb(infra.db);
        return (
          <div
            className={cn(
              "rounded-3xl border p-5",
              db.durable ? "border-line bg-ok/40" : "border-line bg-warn",
            )}
          >
            <p className="font-semibold text-ink">{db.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">{db.body}</p>
          </div>
        );
      })()}

      <div className="rounded-3xl border border-line bg-card p-5 shadow-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{ready ? "جاهز للإطلاق" : `${done} من ${STEPS.length} جاهزة`}</span>
          <span className="text-muted">{Math.round((done / STEPS.length) * 100)}٪</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-forest transition-[width] duration-300"
            style={{ width: `${(done / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="space-y-3">
        {STEPS.map((s) => {
          const on = Boolean(state?.[s.key]);
          return (
            <li key={s.key} className="rounded-3xl border border-line bg-card p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    on ? "bg-ok text-forest" : "border border-line text-muted",
                  )}
                >
                  {on ? <Check className="size-4" /> : s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{s.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {s.key === "hoursOk" ? `${describeOfficeHours(hours)}.` : s.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.href && (
                      <Button asChild variant="outline" size="sm">
                        <a href={s.href}>{s.key === "videoOk" ? "فتح الغرفة" : s.href === "/portal" ? "فتح المساعد" : "فتح الدخول"}</a>
                      </Button>
                    )}
                    <Button
                      variant={on ? "outline" : "forest"}
                      size="sm"
                      disabled={!state || busy === s.key}
                      onClick={() => void toggle(s.key)}
                    >
                      {on ? "تم التثبيت" : s.action}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 sm:grid-cols-3">
        <Hint icon={LogIn} t="العميل" d="دخول → مساعد (نص أو صوت) → حجز → غرفة مرئية." />
        <Hint icon={Mic} t="المساعد" d="يفرّغ التسجيل، يستشير، ويثبّت الموعد." />
        <Hint icon={Bell} t="التذكير" d="يظهر في البوابة والمكتب قبل الموعد." />
      </div>
    </div>
  );
}

function Hint({ icon: Icon, t, d }: { icon: typeof Clock; t: string; d: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
      <Icon className="size-4 text-forest" />
      <div className="mt-2 text-sm font-medium">{t}</div>
      <p className="mt-1 text-xs text-muted">{d}</p>
    </div>
  );
}
