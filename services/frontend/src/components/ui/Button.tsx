import React from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    to?: string;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
}

const sizes: Record<Size, string> = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
};

const variants: Record<Variant, string> = {
    primary:
        "rounded-xl bg-black text-white shadow-sm hover:opacity-90 active:scale-[.99]",
    outline:
        "rounded-xl border border-black/10 hover:bg-black/[.04] active:scale-[.99]",
    ghost: "rounded-xl hover:bg-black/[.05] active:scale-[.99]",
};

export default function Button({
                                   to,
                                   variant = "primary",
                                   size = "md",
                                   fullWidth,
                                   className = "",
                                   children,
                                   ...rest
                               }: Props) {
    const cls = `${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`;
    if (to) return (
        <Link to={to} className={cls}>
            {children}
        </Link>
    );
    return (
        <button className={cls} {...rest}>
            {children}
        </button>
    );
}
