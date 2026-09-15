import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AiConcierge } from "@/components/ai-concierge";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useOffice } from "@/lib/store";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const user = useCurrentUser();
  const name = user?.displayName ?? "عميل";
  const first = name.split(" ")[0];
  const ensurePortalClient = useOffice((s) => s.ensurePortalClient);

  useEffect(() => {
    ensurePortalClient(name);
  }, [name, ensurePortalClient]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-lime">بوابة العميل</p>
        <h1 className="text-xl font-semibold">أهلاً {first}</h1>
        <p className="mt-1 text-sm text-muted">اسأل، يُستشار، ويُحجز موعدك المرئي من هنا.</p>
      </div>
      <AiConcierge clientName={name} />
    </div>
  );
}
