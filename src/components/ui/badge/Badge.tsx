import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full font-medium",
  {
    variants: {
      variant: {
        light: "",
        solid: "",
      },
      color: {
        primary: "",
        success: "",
        error: "",
        warning: "",
        info: "",
        light: "",
        dark: "",
      },
      size: {
        sm: "px-2.5 py-0.5 text-theme-xs",
        md: "px-2.5 py-0.5 text-sm",
      },
    },
    compoundVariants: [
      { variant: "light", color: "primary", className: "bg-primary-subtle text-on-primary-subtle" },
      { variant: "light", color: "success", className: "bg-success-subtle text-on-success-subtle" },
      { variant: "light", color: "error",   className: "bg-error-subtle text-on-error-subtle" },
      { variant: "light", color: "warning", className: "bg-warning-subtle text-on-warning-subtle" },
      { variant: "light", color: "info",    className: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500" },
      { variant: "light", color: "light",   className: "bg-surface-inset text-default dark:bg-white/5 dark:text-white/80" },
      { variant: "light", color: "dark",    className: "bg-gray-500 text-white dark:bg-white/5 dark:text-white" },
      { variant: "solid", color: "primary", className: "bg-primary text-primary-foreground" },
      { variant: "solid", color: "success", className: "bg-success text-white" },
      { variant: "solid", color: "error",   className: "bg-error text-white" },
      { variant: "solid", color: "warning", className: "bg-warning text-white" },
      { variant: "solid", color: "info",    className: "bg-blue-light-500 text-white" },
      { variant: "solid", color: "light",   className: "bg-gray-400 text-white dark:bg-white/5 dark:text-white/80" },
      { variant: "solid", color: "dark",    className: "bg-gray-700 text-white" },
    ],
    defaultVariants: {
      variant: "light",
      color: "primary",
      size: "md",
    },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant,
  color,
  size,
  startIcon,
  endIcon,
  children,
  className,
}) => {
  return (
    <span className={cn(badgeVariants({ variant, color, size }), className)}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
