import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { useOffice } from "@/lib/store";

export const Route = createFileRoute("/portal/requests")({
  component: PortalRequests,
});

function PortalRequests() {
  const requests = useOffice((s) =>
    s.requests.filter((r) => r.clientId === "portal-self" || r.clientId === "abdullah"),
  );
  return (
    <div>
      <h1 className="text-xl font-semibold">طلباتي</h1>
      <p className="mt-1 text-sm text-muted">كل طلب يُفتح من المساعد أو من الخدمات يظهر هنا.</p>
      <ul className="mt-4 space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="rounded-3xl border border-line bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{r.serviceLabel}</div>
                <div className="text-xs text-muted">{r.number}</div>
              </div>
              <StatusPill status={r.status} />
            </div>
            {r.video && (
              <Button asChild variant="lime" className="mt-3 w-full" size="sm">
                <Link to="/consult/$id" params={{ id: r.id }} search={{ as: "client" }}>
                  دخول الاستشارة المرئية
                </Link>
              </Button>
            )}
          </li>
        ))}
        {requests.length === 0 && (
          <div className="rounded-3xl border border-line bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted">لا طلبات بعد.</p>
            <Button asChild variant="lime" size="sm" className="mt-3">
              <Link to="/portal">
                <Sparkles className="size-4" />
                ابدأ من المساعد
              </Link>
            </Button>
          </div>
        )}
      </ul>
    </div>
  );
}
