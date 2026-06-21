import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "surface" | "soft" | "dark" | "premium" | "alert";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  children: ReactNode;
};

export function Card({
  variant = "surface",
  className = "",
  children,
  ...props
}: CardProps) {
  const classes = ["card", variant !== "surface" ? `card--${variant}` : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      <div className="card__body">{children}</div>
    </div>
  );
}
