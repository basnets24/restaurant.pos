import * as React from "react";

import { cn } from "./utils";

type InputSize = "sm" | "default" | "lg";

const sizeClasses: Record<InputSize, string> = {
    sm: "h-8 text-sm px-3 py-1",
    default: "h-10 text-base px-3 py-2",
    lg: "h-11 text-base px-4 py-2",
};

const Input = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input"> & { size?: InputSize }
>(({ className, type, size = "default", ...props }, ref) => {
    return (
        <input
            ref={ref}
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                sizeClasses[size],
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                className,
            )}
            {...props}
        />
    );
});

Input.displayName = "Input";

export { Input };
