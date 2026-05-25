export function tombstoneUniqueValue(value: string, id: string): string {
  return `${value}__deleted__${id}`;
}
