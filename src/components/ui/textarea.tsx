import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-3xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-lime focus:ring-2 focus:ring-lime/15",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
