import { Badge } from "@/components/ui/badge";
import { STATUS_META, type RequestStatus } from "@/lib/types";

export function StatusPill({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone === "warn" ? "warn" : meta.tone === "ok" ? "ok" : "line"}>
      <span
        className={
          meta.tone === "ok" ? "size-1.5 rounded-full bg-forest" : "size-1.5 rounded-full bg-ink/50"
        }
      />
      {meta.label}
    </Badge>
  );
}
