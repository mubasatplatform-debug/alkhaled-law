import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "line",
  children,
}: {
  className?: string;
  tone?: "line" | "warn" | "ok" | "lime" | "forest";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "line" && "bg-paper text-muted border border-line",
        tone === "warn" && "bg-warn text-ink",
        tone === "ok" && "bg-ok text-forest",
        tone === "lime" && "bg-lime text-paper",
        tone === "forest" && "bg-forest text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}
