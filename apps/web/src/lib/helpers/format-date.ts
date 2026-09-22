const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Formats an ISO timestamp for display, e.g. "Jan 1, 2026, 12:00 AM". */
export function formatDateTime(iso: string): string {
  return formatter.format(new Date(iso));
}
