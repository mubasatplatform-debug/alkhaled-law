import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOffice } from "@/lib/store";
import { SERVICE_META, type ServiceSlug } from "@/lib/types";

export function RequestComposer({
  clientId,
  onClose,
  onCreated,
}: {
  clientId?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { clients, addRequest } = useOffice();
  const [cid, setCid] = useState(clientId ?? clients[0]?.id ?? "abdullah");
  const [service, setService] = useState<ServiceSlug>("consult");

  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <h3 className="font-semibold">طلب جديد</h3>
      <div className="mt-3 space-y-2">
        {!clientId && (
          <select
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={service}
          onChange={(e) => setService(e.target.value as ServiceSlug)}
          className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm"
        >
          {(Object.keys(SERVICE_META) as ServiceSlug[]).map((k) => (
            <option key={k} value={k}>
              {SERVICE_META[k].title}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="forest"
          size="sm"
          onClick={() => onCreated(addRequest({ clientId: cid, service }))}
        >
          إنشاء الطلب
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
