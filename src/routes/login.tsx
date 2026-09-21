import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, Video } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>): { next?: string } => ({
    next: typeof raw.next === "string" ? raw.next : undefined,
  }),
  component: Login,
});

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 2H22l-6.8 7.77L23.1 22h-6.3l-4.94-6.46L6.2 22H3.08l7.27-8.3L.9 2h6.46l4.46 5.9L18.9 2Zm-1.1 18h1.75L6.33 3.89H4.46L17.8 20Z"
      />
    </svg>
  );
}

function mapAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("exist")) return "هذا البريد مسجّل. جرّب الدخول.";
  if (m.includes("invalid") || m.includes("credential")) return "البريد أو كلمة المرور غير صحيحة.";
  if (m.includes("password") && m.includes("short")) return "كلمة المرور ٨ أحرف على الأقل.";
  if (m.includes("password")) return "تعذّر قبول كلمة المرور. استخدم ٨ أحرف على الأقل.";
  // A provider with no client id/secret configured fails before any redirect.
  if (m.includes("provider_unavailable"))
    return "الدخول عبر Google غير مفعّل بعد. استخدم البريد وكلمة المرور.";
  if (m.includes("provider") || m.includes("oauth") || m.includes("internal") || m.includes("500"))
    return "الدخول عبر هذا المزوّد غير متاح حالياً. استخدم البريد وكلمة المرور.";
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

function postLoginPath(next?: string): "/office" | "/portal" {
  return next?.startsWith("/office") ? "/office" : "/portal";
}

function Login() {
  const { next } = Route.useSearch();
  const dest = postLoginPath(next);
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState<"google" | "x" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="min-h-dvh bg-cream lg:grid lg:grid-cols-2">
        <div className="hidden bg-lime lg:block" />
        <div className="flex min-h-dvh flex-col justify-center px-6">
          <div className="mx-auto w-full max-w-md space-y-3">
            <div className="h-8 w-40 animate-pulse rounded-full bg-tile" />
            <div className="h-12 w-full animate-pulse rounded-full bg-tile" />
            <div className="h-12 w-full animate-pulse rounded-full bg-tile" />
          </div>
        </div>
      </main>
    );
  }
  if (user) {
    return <Navigate to={dest} />;
  }

  const startSocial = async (providerId: string) => {
    if (!authEnabled || busy) return;
    setError(null);
    setBusy(providerId.includes("google") ? "google" : "x");
    try {
      await signIn(providerId, { callbackURL: dest });
    } catch (err) {
      // A provider whose credentials are missing fails server-side. Without this
      // catch the rejection is unhandled, busy stays set, and the button sits on
      // "جارٍ التحويل…" forever with nothing shown to the visitor.
      setError(mapAuthError(err instanceof Error ? err.message : ""));
      setBusy(null);
    }
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEnabled) return;
    setError(null);
    setBusy("email");
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: dest,
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: dest,
        });
        if (err) throw new Error(err.message);
      }
      await authClient.getSession();
      window.location.href = dest;
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : ""));
      setBusy(null);
    }
  };

  return (
    <main className="min-h-dvh bg-cream lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-lime text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <BrandLockup inverse />
        <div className="relative z-10 max-w-md">
          <p className="text-sm font-medium text-paper/80">بوابة العميل</p>
          <h1 className="mt-3 text-5xl leading-tight">
            ادخل بضغطة واحدة
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/80">
            ادخل بحسابك. المساعد يستشيرك ويحجز استشارتك المرئية في نفس المحادثة — داخل النظام، دون برامج خارجية.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-paper/90">
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-paper/15">
                <Video className="size-4" />
              </span>
              استشارة مرئية داخل الملف
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-paper/15">
                <ShieldCheck className="size-4" />
              </span>
              حساب خاص بطلباتك ومواعيدك
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-paper/15">
                <Lock className="size-4" />
              </span>
              الأحد–الخميس · 9 صباحاً–5 مساءً
            </li>
          </ul>
        </div>
        <img
          src="/images/hero-lawyer.jpg"
          alt=""
          className="relative z-10 mt-8 size-44 rounded-full object-cover object-[center_18%] ring-4 ring-paper/25"
        />
        <p className="relative z-10 mt-3 text-xs text-paper/70">المحامي خالد العنزي · الرياض</p>
        <div className="brand-disc left-4 bottom-28 size-20 rotate-[-18deg] opacity-40" />
        <div className="brand-disc right-8 top-32 size-14 rotate-[16deg] opacity-50" />
      </section>

      <section className="flex min-h-dvh flex-col">
        <div className="relative overflow-hidden bg-lime px-5 pb-10 pt-6 text-paper lg:hidden">
          <div className="flex items-center justify-between">
            <BrandLockup inverse compact />
            <Link to="/" className="text-xs text-paper/80">
              الموقع
            </Link>
          </div>
          <p className="mt-6 text-sm font-medium text-paper/80">بوابة العميل</p>
          <h1 className="mt-1 text-3xl leading-snug">ادخل بضغطة واحدة</h1>
          <p className="mt-2 max-w-xs text-sm text-paper/80">
            المساعد يحجز ويستشير في نفس المحادثة.
          </p>
          <img
            src="/images/hero-lawyer.jpg"
            alt=""
            className="pointer-events-none absolute -left-2 bottom-0 h-28 w-28 rounded-t-full object-cover object-[center_18%] ring-4 ring-paper/20"
          />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8 sm:px-8 lg:justify-center">
          <div className="mb-6 hidden lg:block">
            <h2 className="text-2xl">أهلاً بك</h2>
            <p className="mt-1 text-sm text-muted">دخول سريع — Google أو البريد.</p>
          </div>

          <div className="grid grid-cols-2 rounded-full bg-tile p-1">
            <button
              type="button"
              onClick={() => {
                setMode("in");
                setError(null);
              }}
              className={cn(
                "h-10 rounded-full text-sm font-medium transition-colors",
                mode === "in" ? "bg-paper text-ink shadow-chip" : "text-muted",
              )}
            >
              دخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("up");
                setError(null);
              }}
              className={cn(
                "h-10 rounded-full text-sm font-medium transition-colors",
                mode === "up" ? "bg-paper text-ink shadow-chip" : "text-muted",
              )}
            >
              حساب جديد
            </button>
          </div>

          {authEnabled ? (
            <div className="mt-6 space-y-2">
              {GROK_PROVIDERS.map((p) => {
                const google = p.idp === "google";
                const loading = busy === (google ? "google" : "x");
                return (
                  <button
                    key={p.providerId}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void startSocial(p.providerId)}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-paper text-sm font-medium text-ink transition-colors hover:border-lime/40"
                  >
                    {google ? <GoogleMark /> : <XMark />}
                    {loading
                      ? "جارٍ التحويل…"
                      : google
                        ? "المتابعة عبر Google"
                        : "المتابعة عبر X"}
                  </button>
                );
              })}
              <p className="pt-1 text-center text-xs text-muted">أسرع طريقة — بدون كلمة مرور</p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">الدخول غير مفعّل في هذه البيئة.</p>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            أو بالبريد
            <span className="h-px flex-1 bg-line" />
          </div>

          <form className="space-y-3" onSubmit={submitEmail}>
            {mode === "up" && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted">الاسم</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="خالد…"
                  autoComplete="name"
                  className="h-12"
                />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">البريد الإلكتروني</span>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                dir="ltr"
                className="h-12 text-left"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">
                كلمة المرور
                {mode === "up" ? " · ٨ أحرف على الأقل" : ""}
              </span>
              <span className="relative block">
                <Input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  dir="ltr"
                  className="h-12 pe-12 text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 left-1 flex size-10 items-center justify-center text-muted"
                  aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            {error && (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="xl"
              disabled={Boolean(busy) || !authEnabled}
            >
              {busy === "email"
                ? "جارٍ الدخول…"
                : mode === "in"
                  ? "دخول للبوابة"
                  : "إنشاء الحساب والدخول"}
              <ArrowLeft className="size-4" />
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Lock className="size-3.5" />
            حساب آمن · المواعيد والاستشارات مربوطة بك
          </p>
          <Link to="/" className="mt-4 hidden text-center text-xs text-muted lg:block">
            العودة للموقع
          </Link>
        </div>
      </section>
    </main>
  );
}
