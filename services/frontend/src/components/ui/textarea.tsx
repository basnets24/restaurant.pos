import * as React from "react";

import { cn } from "./utils";

type TextareaSize = "sm" | "default" | "lg";

const sizeClasses: Record<TextareaSize, string> = {
    sm: "text-sm px-3 py-2",
    default: "text-base px-3 py-2",
    lg: "text-base px-4 py-3",
};

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<"textarea"> & { size?: TextareaSize }
>(({ className, size = "default", ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            data-slot="textarea"
            className={cn(
                "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-md border bg-input-background transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
                sizeClasses[size],
                className,
            )}
            {...props}
        />
    );
});

Textarea.displayName = "Textarea";

export { Textarea };
