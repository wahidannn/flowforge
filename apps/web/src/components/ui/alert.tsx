import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-line bg-white px-4 py-3 text-sm text-ink", className)} {...props} />;
}
