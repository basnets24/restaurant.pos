import { cn } from "@/components/ui/utils";

export interface ServiceFlowNode {
    name: string;
    highlight: string;
}

export interface ServiceFlowDiagramProps {
    services: ServiceFlowNode[];
    className?: string;
}

/** Four independent services, deliberately shown with no connecting arrows — they
 * communicate over events (MassTransit/RabbitMQ), not a linear call chain, and a row
 * of arrows would read as "Identity calls Catalog calls Order calls Payment," which
 * isn't the architecture. A plain grid avoids implying a request pipeline that doesn't exist. */
export function ServiceFlowDiagram({ services, className }: ServiceFlowDiagramProps) {
    return (
        <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)} role="list" aria-label="Independent services">
            {services.map((s) => (
                <div key={s.name} role="listitem" className="rounded-lg border border-border bg-card px-5 py-4 text-center">
                    <div className="text-sm font-medium text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.highlight}</div>
                </div>
            ))}
        </div>
    );
}
