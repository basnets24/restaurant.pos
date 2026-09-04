import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function StatCard({ label, value, change, trend = "neutral", icon, className = "", size = "md", onClick }: StatCardProps) {
  const sizeCls = size === "sm" ? "p-3 sm:p-4" : size === "lg" ? "p-6 sm:p-8" : "p-4 sm:p-6";
  const changeCls = trend === "up" ? "text-status-available" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  const interactive = onClick
    ? "cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:bg-secondary hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "";
  return (
    <Card
      className={`${className} h-full ${interactive}`}
      {...(onClick
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
            },
          }
        : {})}
    >
      <CardContent className={sizeCls}>
        <div className="flex items-center justify-between">
          <div>
            {/* min-h reserves 2 lines of text-sm regardless of whether this
                label actually wraps, so a short label ("Active Orders") and a
                wrapping one ("Tables Occupied") still put their value on the
                same baseline within a row of the stats grid. */}
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 min-h-[2rem] sm:min-h-[2.5rem]">{label}</p>
            <div className="text-lg sm:text-2xl font-bold">{value}</div>
            {change && <p className={`text-xs sm:text-sm ${changeCls}`}>{change}</p>}
          </div>
          {icon && <div className="shrink-0">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;

