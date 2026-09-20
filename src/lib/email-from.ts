export function resolveMailFrom(raw: string | undefined): string {
  const v = raw?.trim();
  return v && v.length > 0 ? v : "CabFleet <noreply@localhost>";
}
