/** Only allow a return to the public minutes page. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/report/")) return null;
  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) return null;
  return value;
}
