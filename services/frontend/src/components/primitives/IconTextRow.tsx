import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";

export interface IconTextRowProps {
    /** Omit for a plain text row (e.g. an argument list with no per-item icon). */
    icon?: LucideIcon;
    title: string;
    description: string;
    className?: string;
}

/** A divided list row: optional icon chip + heading + paragraph. Used where content is a set
 * of related points to scan, not a set of comparable tiles a card grid would imply. */
export function IconTextRow({ icon: Icon, title, description, className }: IconTextRowProps) {
    return (
        <div className={cn("flex gap-4 py-5 border-b border-border last:border-b-0 last:pb-0", className)}>
            {Icon && (
                <div className="w-9 h-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                </div>
            )}
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
