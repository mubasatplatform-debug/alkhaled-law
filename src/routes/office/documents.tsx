import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clientById, useOffice } from "@/lib/store";
import { DOC_STATUS } from "@/lib/types";

export const Route = createFileRoute("/office/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { documents, clients } = useOffice();
  return (
    <div>
      <h1 className="text-2xl font-semibold">المستندات</h1>
      <p className="mt-1 text-sm text-muted">ملفات مرتبطة بملفات العملاء والطلبات.</p>
      <ul className="mt-5 space-y-2">
        {documents.map((d) => {
          const c = clientById(d.clientId, clients);
          return (
            <li key={d.id}>
              <Link
                to="/office/clients/$clientId"
                params={{ clientId: d.clientId }}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
              >
                <FileText className="size-5 text-forest" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted">
                    {c?.name} · {d.uploadedAt}
                  </div>
                </div>
                <Badge tone={DOC_STATUS[d.status].tone}>{DOC_STATUS[d.status].label}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
