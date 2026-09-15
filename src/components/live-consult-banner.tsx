import { Link } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";

export function LiveConsultBanner({
  role,
  name,
  roomId = "r1024",
  compact = false,
}: {
  role: Role;
  name: string;
  roomId?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-lime/15 bg-paper px-3.5 py-3 shadow-card">
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-paper">
        <Video className="size-4" />
        <span className="live-dot absolute -left-0.5 -top-0.5 size-2.5 rounded-full bg-ok ring-2 ring-paper" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">استشارة مرئية جاهزة الآن</div>
        {!compact && (
          <div className="text-xs text-muted">
            {role === "lawyer"
              ? `مع ${name} · داخل النظام · من أي جهاز`
              : "المحامي خالد العنزي بانتظارك في الغرفة"}
          </div>
        )}
      </div>
      <Button asChild variant="lime" size="sm">
        <Link to="/consult/$id" params={{ id: roomId }} search={{ as: role }}>
          دخول الغرفة
        </Link>
      </Button>
    </div>
  );
}
