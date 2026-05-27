import React, { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      intent: {
        primary:
          "bg-primary text-primary-foreground shadow-theme-xs hover:bg-primary-hover",
        outline:
          "bg-surface-elevated text-default ring-1 ring-inset ring-default hover:bg-surface-inset dark:ring-border dark:hover:bg-surface-inset",
        ghost:
          "text-default hover:bg-surface-inset",
        destructive:
          "bg-error text-white hover:opacity-90",
      },
      size: {
        sm: "px-4 py-3 text-sm",
        md: "px-5 py-3.5 text-sm",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  },
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: ReactNode;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  intent,
  size,
  startIcon,
  endIcon,
  onClick,
  className,
  disabled = false,
  type = "button",
}) => {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ intent, size }), className)}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
