import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <span className="relative inline-flex h-4 w-4 items-center justify-center">
    <input
      ref={ref}
      type="checkbox"
      className={cn("peer h-4 w-4 appearance-none border border-line bg-white checked:border-ink checked:bg-ink", className)}
      {...props}
    />
    <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
  </span>
));
Checkbox.displayName = "Checkbox";
