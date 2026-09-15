import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  Folder,
  Home,
  Menu,
  MessageCircle,
  Receipt,
  Rocket,
  Search,
  Settings,
  Users,
  BarChart3,
  X,
} from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureOfficeSession } from "@/lib/office-live";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/office", label: "نظرة عامة", icon: Home },
  { to: "/office/clients", label: "العملاء", icon: Users },
  { to: "/office/requests", label: "الطلبات والقضايا", icon: FileText },
  { to: "/office/appointments", label: "المواعيد", icon: Calendar },
  { to: "/office/messages", label: "المحادثات", icon: MessageCircle },
  { to: "/office/documents", label: "المستندات", icon: Folder },
  { to: "/office/offers", label: "العروض والفواتير", icon: Receipt },
  { to: "/office/tasks", label: "المهام", icon: CheckSquare },
  { to: "/office/reports", label: "التقارير", icon: BarChart3 },
] as const;

function NavList({ onClick }: { onClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active =
          item.to === "/office"
            ? pathname === "/office"
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-paper/10 text-lime font-medium"
                : "text-paper/75 hover:bg-white/5 hover:text-paper",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <Link
        to="/office/launch"
        onClick={onClick}
        className={cn(
          "mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
          pathname === "/office/launch"
            ? "bg-paper/10 text-lime"
            : "text-paper/75 hover:bg-white/5",
        )}
      >
        <Rocket className="size-4" />
        تجهيز الإطلاق
      </Link>
      <Link
        to="/office/settings"
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
          pathname === "/office/settings"
            ? "bg-paper/10 text-lime"
            : "text-paper/75 hover:bg-white/5",
        )}
      >
        <Settings className="size-4" />
        الإعدادات
      </Link>
    </nav>
  );
}

export function OfficeShell() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<"staff" | "client" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isPending || !user) return;
    let live = true;
    void ensureOfficeSession()
      .then((r) => {
        if (live) setRole(r.role);
      })
      .catch(() => {
        if (live) setRole("client");
      });
    return () => {
      live = false;
    };
  }, [user, isPending]);

  if (isPending || (user && !role)) {
    return (
      <div className="min-h-dvh bg-cream">
        <div className="h-14 border-b border-line bg-paper" />
        <p className="px-6 py-10 text-sm text-muted">جارٍ فتح المكتب…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ next: "/office" }} />;
  }
  if (role === "client") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream px-5">
        <div className="w-full max-w-md rounded-3xl border border-line bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <BrandLockup />
          <h1 className="mt-5 text-xl font-semibold">هذا حساب عميل</h1>
          <p className="mt-2 text-sm text-muted">
            لوحة المكتب لحساب المحامي. مواعيدك واستشارتك من بوابة العميل.
          </p>
          <Button asChild className="mt-5 w-full" variant="lime">
            <Link to="/portal">فتح بوابة العميل</Link>
          </Button>
        </div>
      </div>
    );
  }

  const first = user.displayName?.split(" ")[0] ?? "خالد";

  return (
    <div className="min-h-dvh overflow-x-hidden bg-cream">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col bg-forest text-paper lg:flex">
        <div className="px-5 py-6">
          <BrandLockup inverse />
        </div>
        <NavList />
        <p className="mt-auto px-6 pb-6 text-xs leading-relaxed text-paper/45">
          وضوح في الرؤية.
          <br />
          ثقة في الخطوة.
        </p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col bg-forest text-paper">
            <div className="flex items-center justify-between px-5 py-5">
              <BrandLockup inverse compact />
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>
            <NavList onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pr-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full hover:bg-cream lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="ابحث عن عميل أو طلب" className="pr-10 bg-cream/60" />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Badge tone="forest">حجوزات البوابة حية</Badge>
            <Link
              to="/portal"
              className="hidden rounded-full px-3 py-1.5 text-xs text-muted hover:text-ink sm:inline"
            >
              بوابة العميل
            </Link>
            <button
              type="button"
              className="relative flex size-10 items-center justify-center rounded-full hover:bg-cream"
              aria-label="إشعارات"
            >
              <Bell className="size-4" />
              <span className="absolute left-2 top-2 size-1.5 rounded-full bg-lime" />
            </button>
            <div className="flex items-center gap-2 ps-1">
              <img
                src="/images/lawyer.jpg"
                alt=""
                className="size-9 rounded-full object-cover"
              />
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-medium">{first}</div>
                <div className="text-xs text-muted">المحامي الرئيسي</div>
              </div>
            </div>
          </div>
        </header>
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <BrandMark className="pointer-events-none fixed bottom-6 left-4 hidden size-24 opacity-[0.04] lg:block" />
    </div>
  );
}
