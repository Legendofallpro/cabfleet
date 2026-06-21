/** Serializable user summary passed from admin layout into client header components. */
export type HeaderUser = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

export function getHeaderDisplayName(user: HeaderUser): string {
  return user.fullName?.split(" ")[0] ?? user.email;
}

export function getHeaderInitials(user: HeaderUser): string {
  const source = user.fullName ?? user.email;
  return source[0]?.toUpperCase() ?? "?";
}
