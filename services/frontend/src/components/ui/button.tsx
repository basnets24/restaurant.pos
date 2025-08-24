import React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils"; // if you have it; else inline a simple class joiner

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = {
    to?: LinkProps["to"];
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
const variants: Record<Variant, string> = {
    primary: "bg-[#2a1f20] text-white hover:bg-[#3a2d2e] focus:ring-[#2a1f20]",
    outline: "border border-black/15 text-[#2a1f20] hover:bg-black/5",
    ghost: "text-[#2a1f20] hover:bg-black/5",
};
const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
};

export default function Button({
                                   to,
                                   variant = "primary",
                                   size = "md",
                                   fullWidth,
                                   className,
                                   children,
                                   ...rest
                               }: Props) {
    const cls = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
    if (to) return <Link to={to} className={cls} {...(rest as any)}>{children}</Link>;
    return <button className={cls} {...rest}>{children}</button>;
}
