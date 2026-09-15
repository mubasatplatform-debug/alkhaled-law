import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calendar, FileText, Sparkles, User } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/portal", label: "المساعد", icon: Sparkles },
  { to: "/portal/requests", label: "طلباتي", icon: FileText },
  { to: "/portal/appointments", label: "المواعيد", icon: Calendar },
  { to: "/portal/account", label: "حسابي", icon: User },
] as const;

export function PortalShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isPending) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
        <div className="flex h-14 items-center border-b border-line bg-paper px-4 text-sm font-medium text-ink">
          بوابة العميل
        </div>
        <div className="flex-1 space-y-3 px-4 pt-6">
          <p className="text-sm text-muted">جارٍ تجهيز حسابك…</p>
          <div className="h-40 animate-pulse rounded-3xl bg-tile" />
        </div>
      </div>
    );
  }
  if (!user) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-cream">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <BrandMark className="size-8" />
          <span className="font-kufi text-sm font-bold">المحامي خالد العنزي</span>
        </Link>
        <span className="max-w-[9rem] truncate text-xs text-muted">{user.displayName?.split(" ")[0]}</span>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-line bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md">
        {TABS.map((tab) => {
          const active =
            tab.to === "/portal" ? pathname === "/portal" : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-xs transition-colors",
                active ? "bg-lime text-paper font-medium" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
