import * as React from "react";

type Breakpoints = Partial<{ base: number; sm: number; md: number; lg: number; xl: number }>;

export interface CardGridProps extends React.PropsWithChildren {
  cols?: Breakpoints; // number of columns per breakpoint
  gap?: string; // tailwind gap classes like "gap-4"
  className?: string;
  equalHeight?: boolean; // wrap children with h-full to equalize heights
}

function toCols(bp?: number) {
  if (!bp || bp <= 0) return "";
  return `grid-cols-${bp}`;
}

export function CardGrid({ cols, gap = "gap-4", className = "", equalHeight = true, children }: CardGridProps) {
  const base = toCols(cols?.base ?? 1);
  const sm = cols?.sm ? `sm:${toCols(cols.sm)}` : "";
  const md = cols?.md ? `md:${toCols(cols.md)}` : "";
  const lg = cols?.lg ? `lg:${toCols(cols.lg)}` : "";
  const xl = cols?.xl ? `xl:${toCols(cols.xl)}` : "";

  const cls = ["grid", base, sm, md, lg, xl, gap, className].filter(Boolean).join(" ");

  const content = React.Children.map(children, (child) =>
    equalHeight ? <div className="h-full">{child}</div> : child,
  );

  return <div className={cls}>{content}</div>;
}

export default CardGrid;

