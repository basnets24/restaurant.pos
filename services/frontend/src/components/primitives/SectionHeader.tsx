import { cn } from "@/components/ui/utils";

export interface SectionHeaderProps {
    /** "technical" pairs with denser, engineering-facing content; "editorial" pairs with narrative/argument content. Both render left-aligned, no badge. */
    variant: "technical" | "editorial";
    eyebrow?: string;
    title: string;
    description?: string;
    className?: string;
}

export function SectionHeader({ variant, eyebrow, title, description, className }: SectionHeaderProps) {
    return (
        <div className={cn("max-w-2xl space-y-3", className)}>
            {eyebrow && (
                <span className="block text-xs font-medium tracking-wide uppercase text-muted-foreground">
                    {eyebrow}
                </span>
            )}
            <h2 className={variant === "technical" ? "text-2xl sm:text-3xl text-foreground leading-tight" : "text-3xl sm:text-4xl text-foreground leading-tight"}>
                {title}
            </h2>
            {description && <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>}
        </div>
    );
}
