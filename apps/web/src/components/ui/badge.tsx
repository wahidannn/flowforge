import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center border px-2 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-sage bg-sage text-white",
      outline: "border-line bg-white text-ink",
      warning: "border-coral bg-white text-coral",
      muted: "border-line bg-paper text-slate-600",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
