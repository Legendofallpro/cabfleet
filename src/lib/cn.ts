import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx (conditional class logic) with tailwind-merge
 * (deduplication of conflicting Tailwind utilities).
 *
 * Use this in every ui/* and common/* component instead of manual
 * string concatenation or template literals.
 *
 * @example
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
