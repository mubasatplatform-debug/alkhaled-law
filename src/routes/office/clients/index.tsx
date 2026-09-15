import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMergedOffice } from "@/lib/office-live";

export const Route = createFileRoute("/office/clients/")({
  component: ClientsPage,
});

function ClientsPage() {
  const { clients } = useMergedOffice();
  return (
    <div>
      <h1 className="text-2xl font-semibold">العملاء</h1>
      <p className="mt-1 text-sm text-muted">ملفات العملاء المرتبطة بالطلبات والاستشارات المرئية</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => (
          <Link
            key={c.id}
            to="/office/clients/$clientId"
            params={{ clientId: c.id }}
            className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 shadow-[var(--shadow-card)]"
          >
            {c.avatar ? (
              <img src={c.avatar} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest">
                <Building2 className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted">
                {c.source === "بوابة العميل" ? "من البوابة" : `${c.city} · ${c.phone}`}
              </div>
            </div>
            {c.active && <Badge tone="ok">عميل نشط</Badge>}
          </Link>
        ))}
      </div>
    </div>
  );
}
