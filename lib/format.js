// Date formatting for API timestamps (ISO strings), shown in Indian style.

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// "20 Oct 2026"; "—" when there is no date.
export function formatDate(value) {
  return value ? DATE.format(new Date(value)) : "—";
}

// "20 Oct 2026, 3:45 pm"; "—" when there is no date.
export function formatDateTime(value) {
  return value ? DATE_TIME.format(new Date(value)) : "—";
}
