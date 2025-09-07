import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatCard({ label, value, change, trend = "neutral", icon, className = "", size = "md" }: StatCardProps) {
  const sizeCls = size === "sm" ? "p-4" : size === "lg" ? "p-8" : "p-6";
  const changeCls = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";
  return (
    <Card className={className + " h-full"}>
      <CardContent className={sizeCls}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <div className="text-2xl font-bold">{value}</div>
            {change && <p className={`text-sm ${changeCls}`}>{change}</p>}
          </div>
          {icon && <div className="shrink-0">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;

