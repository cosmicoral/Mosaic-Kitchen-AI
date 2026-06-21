import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "green" | "gold" | "dark" | "cream" | "red" | "blue";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

export function Badge({
  variant = "green",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={["badge", `badge--${variant}`, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </span>
  );
}
