import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-10", inverse ? "text-paper" : "text-lime", className)}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 3h16a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2.35A2.65 2.65 0 0 0 5.35 8v16A2.65 2.65 0 0 0 8 26.65h16A2.65 2.65 0 0 0 26.65 24V8A2.65 2.65 0 0 0 24 5.35H8ZM16 10.1a5.9 5.9 0 1 0 0 11.8 5.9 5.9 0 0 0 0-11.8Zm0 2.55a3.35 3.35 0 1 1 0 6.7 3.35 3.35 0 0 1 0-6.7Z"
      />
    </svg>
  );
}

export function BrandLockup({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", inverse ? "text-paper" : "text-ink")}>
      <BrandMark inverse={inverse} className="size-10 shrink-0" />
      <div className="leading-tight">
        <div className="font-kufi text-sm font-bold tracking-tight">المحامي خالد العنزي</div>
        {!compact && (
          <div
            className={cn(
              "mt-0.5 text-[11px] tracking-wide",
              inverse ? "text-paper/70" : "text-muted",
            )}
          >
            محاماة واستشارات قانونية
          </div>
        )}
      </div>
    </div>
  );
}
