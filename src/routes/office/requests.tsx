import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { clientById } from "@/lib/store";
import { useMergedOffice } from "@/lib/office-live";

export const Route = createFileRoute("/office/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const { requests, clients } = useMergedOffice();
  return (
    <div>
      <h1 className="text-2xl font-semibold">الطلبات والقضايا</h1>
      <p className="mt-1 text-sm text-muted">كل طلب مربوط بملف عميل، والاستشارة المرئية تدخل من هنا.</p>
      <div className="mt-5 min-w-0 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">الرقم</th>
              <th className="px-4 py-3 font-medium">العميل</th>
              <th className="px-4 py-3 font-medium">الخدمة</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">المسؤول</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const c = clientById(r.clientId, clients);
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{r.number}</td>
                  <td className="px-4 py-3">{c?.name}</td>
                  <td className="px-4 py-3 text-muted">{r.serviceLabel}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{r.owner}</td>
                  <td className="px-4 py-3">
                    {r.video ? (
                      <Button asChild variant="lime" size="sm">
                        <Link to="/consult/$id" params={{ id: r.id }} search={{ as: "lawyer" }}>
                          غرفة مرئية
                        </Link>
                      </Button>
                    ) : (
                      <Link
                        to="/office/clients/$clientId"
                        params={{ clientId: r.clientId }}
                        className="text-xs text-muted"
                      >
                        الملف
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
