import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/portal/account")({
  component: PortalAccount,
});

function PortalAccount() {
  const user = useCurrentUser();
  const name = user?.displayName ?? "عميل";
  const email = user?.primaryEmail;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {user?.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-14 rounded-full object-cover" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-lime text-lg font-semibold text-paper">
            {name.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="truncate text-sm text-muted">{email ?? "عميل مسجّل"}</p>
        </div>
      </div>
      <section className="rounded-3xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-medium">حسابك في المكتب</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          الطلبات والمواعيد مربوطة بهذا الحساب. الاستشارة المرئية تتم داخل التطبيق.
        </p>
        <ul className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-center gap-2 text-ink">
            <Sparkles className="size-4 text-forest" />
            مساعد يحجز ويستشير في نفس المحادثة
          </li>
          <li className="flex items-center gap-2 text-ink">
            <Video className="size-4 text-forest" />
            غرفة مرئية داخل النظام
          </li>
          <li className="flex items-center gap-2 text-ink">
            <ShieldCheck className="size-4 text-forest" />
            بياناتك لا تُعرض لعملاء آخرين
          </li>
        </ul>
        <div className="mt-4">
          <UserButton />
        </div>
      </section>
      <Button asChild variant="lime" className="w-full">
        <Link to="/portal">فتح المساعد</Link>
      </Button>
      <Link to="/" className="block text-center text-xs text-muted">
        العودة للموقع
      </Link>
    </div>
  );
}
