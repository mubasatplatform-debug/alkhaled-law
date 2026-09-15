import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-full border border-line bg-card px-3.5 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-lime focus:ring-2 focus:ring-lime/15",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
