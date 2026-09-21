import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  FileSearch,
  FileText,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useOffice } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ServiceSlug } from "@/lib/types";

export const Route = createFileRoute("/")({ component: Home });

const SERVICES: {
  slug: ServiceSlug;
  title: string;
  blurb: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "consult",
    title: "استشارة",
    blurb: "غرفة مرئية داخل النظام مع محامٍ مختص.",
    icon: MessageCircle,
  },
  {
    slug: "review",
    title: "مراجعة",
    blurb: "تحليل بنود العقد وتوضيح الالتزامات.",
    icon: FileSearch,
  },
  {
    slug: "draft",
    title: "صياغة",
    blurb: "إعداد عقود قانونية دقيقة وواضحة.",
    icon: FileText,
  },
  {
    slug: "case",
    title: "قضية",
    blurb: "تحليل شامل ووضع الخيارات المناسبة.",
    icon: Scale,
  },
];

const STEPS = [
  { n: "01", title: "ادخل بحسابك", body: "Google أو البريد — ثوانٍ، ثم بوابتك الخاصة." },
  { n: "02", title: "اكتب للمساعد", body: "اشرح موضوعك. يستشيرك فوراً بتوجيه أوّلي." },
  { n: "03", title: "يثبّت الموعد", body: "تختار الوقت، ويُحجز الاستشارة المرئية في نفس المحادثة." },
  { n: "04", title: "ادخل الغرفة", body: "الجلسة داخل النظام — دون زووم أو تطبيقات خارجية." },
];

function Chip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 shadow-chip",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-lime text-paper">
        <Icon className="size-3.5" />
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
    </div>
  );
}

function ClientEntry() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="hidden h-10 w-24 animate-pulse rounded-full bg-tile md:block" />;
  }
  if (user) {
    return (
      <Link
        to="/portal"
        className="hidden h-10 items-center rounded-full border border-line px-4 text-sm font-medium md:inline-flex"
      >
        بوابتي
      </Link>
    );
  }
  return (
    <Link
      to="/login"
      className="hidden h-10 items-center rounded-full border border-line px-4 text-sm font-medium md:inline-flex"
    >
      دخول العميل
    </Link>
  );
}

function HeroCta({ className, size = "xl" }: { className?: string; size?: "lg" | "xl" }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className={cn("h-14 w-56 animate-pulse rounded-full bg-tile", className)} />;
  }
  return (
    <Button asChild variant="lime" size={size} className={className}>
      <Link to={user ? "/portal" : "/login"}>
        {user ? "فتح المساعد" : "ادخل واحجز مع المساعد"}
        <ArrowLeft className="size-5" />
      </Link>
    </Button>
  );
}

function Home() {
  const addIntake = useOffice((s) => s.addIntake);
  const [sent, setSent] = useState<string | null>(null);
  const [faq, setFaq] = useState<number | null>(null);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-cream">
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <BrandLockup />
          <nav className="ms-auto hidden items-center gap-7 text-sm text-muted lg:flex">
            <a href="#home" className="font-medium text-ink">
              الرئيسية
            </a>
            <a href="#services" className="hover:text-ink">
              الخدمات
            </a>
            <a href="#how" className="hover:text-ink">
              آلية العمل
            </a>
            <a href="#contact" className="hover:text-ink">
              تواصل معنا
            </a>
          </nav>
          <ClientEntry />
          <Button asChild variant="lime" size="sm">
            <Link to="/login">
              احجز استشارة
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section
        id="home"
        className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-8 pt-6 lg:grid-cols-2 lg:gap-12 lg:pb-16 lg:pt-10"
      >
        <div className="min-w-0">
          <h1 className="text-4xl leading-[1.18] text-ink sm:text-5xl lg:text-7xl lg:leading-[1.1]">
            وضوح في الرؤية.
            <br />
            ثقة في الخطوة.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            ادخل بوابتك، اكتب موضوعك للمساعد: يعطيك توجيهاً أولياً ويحجز استشارتك المرئية مع المحامي خالد — داخل النظام، دون مغادرة الملف.
          </p>
          <HeroCta className="mt-7 hidden lg:inline-flex" />
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
          <div className="brand-disc left-0 top-8 size-14 rotate-[-18deg] lg:size-16" />
          <div className="brand-disc right-2 bottom-24 size-10 rotate-[22deg] lg:size-12" />
          <div className="brand-disc right-10 top-2 size-7 rotate-[8deg] opacity-80" />
          <div className="relative mx-auto aspect-square overflow-hidden rounded-full ring-8 ring-paper shadow-glow">
            <img
              src="/images/hero-lawyer.jpg"
              alt="المحامي خالد العنزي في مكتبه"
              className="h-full w-full object-cover object-[center_18%]"
            />
          </div>
          <Chip icon={Video} label="استشارة مرئية" className="absolute right-3 top-10 lg:right-6 lg:top-14" />
          <Chip
            icon={ShieldCheck}
            label="داخل النظام"
            className="absolute bottom-12 left-3 lg:bottom-16 lg:left-6"
          />
          <Chip
            icon={Calendar}
            label="الأحد–الخميس"
            className="absolute bottom-4 right-4 hidden sm:flex lg:bottom-8 lg:right-10"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-6 lg:hidden">
        <HeroCta className="w-full" />
      </div>

      <section id="services" className="mx-auto max-w-6xl px-4 py-6 lg:py-12">
        <p className="text-sm font-medium text-lime">خدماتنا القانونية</p>
        <h2 className="mt-1 text-2xl text-ink lg:text-3xl">كيف نساعدك؟</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              to="/portal/services/$slug"
              params={{ slug: s.slug }}
              className="group flex flex-col rounded-3xl bg-tile p-4 transition-transform active:scale-[0.99] lg:p-5"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-lime text-paper">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base">{s.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted lg:text-sm">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-2">
        <div className="flex items-center gap-3 rounded-3xl bg-ok px-4 py-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-forest">
            <Sparkles className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink">المساعد يحجز ويستشير</div>
            <p className="text-xs text-forest/80">محادثة واحدة: توجيه قانوني أولي ثم تثبيت الموعد المرئي.</p>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <p className="text-sm font-medium text-lime">آلية العمل</p>
        <h2 className="mt-1 max-w-lg text-2xl text-ink lg:text-4xl">من أول سؤال، إلى خطوة واضحة</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((st) => (
            <div key={st.n}>
              <div className="flex size-11 items-center justify-center rounded-full bg-lime text-sm font-bold text-paper">
                {st.n}
              </div>
              <h3 className="mt-4 text-base">{st.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{st.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 lg:grid-cols-2 lg:gap-12 lg:pb-20">
        <div className="relative overflow-hidden rounded-4xl">
          <img
            src="/images/consult.jpg"
            alt="استشارة قانونية في المكتب"
            className="aspect-[4/3] w-full object-cover"
          />
          <Chip icon={Sparkles} label="المساعد جاهز" className="absolute right-4 top-4" />
          <Chip icon={Video} label="غرفة داخل الملف" className="absolute bottom-5 left-4" />
        </div>
        <div>
          <h2 className="text-2xl text-ink lg:text-4xl">كل الملف في جوالك</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted lg:text-base">
            الطلبات، المواعيد، والاستشارة المرئية في مكان واحد. بدون تطبيقات خارجية، وبدون تشتت بين واتساب والبريد.
          </p>
          <HeroCta size="lg" className="mt-6" />
        </div>
      </section>

      <section id="contact" className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-4xl">
          <img
            src="/images/client-file.jpg"
            alt=""
            className="h-64 w-full object-cover lg:h-full"
          />
        </div>
        <div>
          <h2 className="text-3xl text-ink">ابدأ بموضوعك</h2>
          <p className="mt-2 text-sm text-muted">
            الأسرع: ادخل البوابة ودع المساعد يستشيرك ويحجز. أو أرسل نبذة من هنا ويظهر الطلب في المكتب.
          </p>
          {sent ? (
            <div className="mt-6 rounded-3xl bg-ok p-5">
              <div className="font-semibold">وصلنا طلبك</div>
              <p className="mt-1 text-sm text-muted">
                يظهر الآن في لوحة المكتب. لمتابعة الملف ادخل بوابة العميل.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="lime" size="sm">
                  <Link to="/login">دخول البوابة</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/office">لوحة المكتب</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const id = addIntake({
                  name: String(fd.get("name") || ""),
                  phone: String(fd.get("phone") || ""),
                  service: String(fd.get("service") || "consult") as ServiceSlug,
                  summary: String(fd.get("summary") || ""),
                });
                setSent(id);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="name" required placeholder="الاسم" />
                <Input name="phone" required placeholder="رقم الجوال" />
              </div>
              <select
                name="service"
                className="h-11 w-full rounded-full border border-line bg-card px-3.5 text-sm"
                defaultValue="consult"
              >
                <option value="consult">استشارة مرئية</option>
                <option value="review">مراجعة عقد</option>
                <option value="draft">صياغة عقد</option>
                <option value="case">دراسة قضية</option>
              </select>
              <Textarea name="summary" placeholder="اكتب نبذة مختصرة عن موضوعك…" />
              <Button type="submit" variant="lime" className="w-full" size="xl">
                إرسال الطلب
                <ArrowLeft className="size-4" />
              </Button>
            </form>
          )}
          <div className="mt-8 divide-y divide-line">
            {[
              [
                "كيف أحجز استشارة؟",
                "ادخل بحساب Google أو البريد، اكتب للمساعد موضوعك. يستشيرك ويعرض الأوقات، وتثبّت الموعد بضغطة — الجلسة داخل النظام.",
              ],
              ["كيف أتابع طلبي؟", "من بوابة العميل تظهر حالة كل طلب، والمواعيد، والمستندات المطلوبة."],
              ["كيف أرسل مستنداتي؟", "ارفق الملف من شاشة الخدمة أو أثناء الجلسة المرئية عبر مشاركة الشاشة."],
            ].map(([q, a], i) => (
              <button
                key={q}
                type="button"
                className="flex w-full items-start justify-between gap-4 py-3 text-right"
                onClick={() => setFaq(faq === i ? null : i)}
              >
                <span>
                  <span className="block text-sm font-medium">{q}</span>
                  {faq === i && <span className="mt-1 block text-sm text-muted">{a}</span>}
                </span>
                <span className="text-lg text-muted">{faq === i ? "−" : "+"}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-lime text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center">
          <BrandLockup inverse />
          <div className="flex gap-5 text-sm text-paper/80 sm:ms-auto">
            <a href="#contact">تواصل معنا</a>
            <Link to="/office">لوحة المكتب</Link>
            <Link to="/terms">شروط الخدمة</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
