import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-surface rounded-[24px] shadow-[0_8px_30px_rgba(232,131,127,.14)] p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
