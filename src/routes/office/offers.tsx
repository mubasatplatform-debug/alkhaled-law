import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { clientById, useOffice } from "@/lib/store";
import { OFFER_STATUS } from "@/lib/types";

export const Route = createFileRoute("/office/offers")({
  component: OffersPage,
});

function OffersPage() {
  const { offers, clients } = useOffice();
  return (
    <div>
      <h1 className="text-2xl font-semibold">العروض والفواتير</h1>
      <p className="mt-1 text-sm text-muted">عروض الخدمة المرتبطة بملفات العملاء.</p>
      <ul className="mt-5 space-y-2">
        {offers.map((r) => {
          const c = clientById(r.clientId, clients);
          return (
            <li key={r.id}>
              <Link
                to="/office/clients/$clientId"
                params={{ clientId: r.clientId }}
                className="flex items-center gap-4 rounded-2xl border border-line bg-card px-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted">
                    {r.number} · {c?.name}
                  </div>
                </div>
                <div className="text-sm tabular-nums">{r.amount}</div>
                <Badge tone={OFFER_STATUS[r.status].tone}>{OFFER_STATUS[r.status].label}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
