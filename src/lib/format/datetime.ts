export function formatDateTime(
  value: Date | string | number,
  opts: {
    locale: string;
    timeZone: string;
    dateStyle?: "short" | "medium" | "long";
    timeStyle?: "short" | "medium";
  },
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(opts.locale, {
    timeZone: opts.timeZone,
    dateStyle: opts.dateStyle ?? "medium",
    timeStyle: opts.timeStyle,
  }).format(d);
}
