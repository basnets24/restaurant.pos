"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Re-skinned to match the app's flat, earthy design system instead of sonner's default
 * (rounded pill, saturated rich-colors green/red). `unstyled` strips sonner's own chrome
 * so every visual comes from the classNames below, using the same semantic tokens the rest
 * of the app draws from (bg-popover/border-border/etc, brand.css) rather than raw sonner
 * defaults - a toast should look like it belongs next to a Card or Dialog, not like a
 * separate off-brand library dropped on top.
 */
const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            icons={{
                success: <CheckCircle2 className="h-5 w-5 shrink-0 text-status-available" />,
                error: <XCircle className="h-5 w-5 shrink-0 text-destructive" />,
            }}
            toastOptions={{
                unstyled: true,
                classNames: {
                    toast:
                        "group toast flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg font-sans",
                    title: "text-sm font-semibold leading-snug",
                    description: "mt-0.5 text-[13px] text-muted-foreground",
                    actionButton:
                        "!rounded-[10px] !bg-primary !px-3 !py-1.5 !text-xs !font-semibold !text-primary-foreground",
                    cancelButton:
                        "!rounded-[10px] !bg-transparent !px-3 !py-1.5 !text-xs !text-muted-foreground",
                    closeButton:
                        "!border-border !bg-popover !text-muted-foreground hover:!text-foreground",
                    success: "!border-status-available/40",
                    error: "!border-destructive/40",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
