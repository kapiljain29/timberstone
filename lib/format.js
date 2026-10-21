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

// A Date as a <input type="datetime-local"> value on this device's clock
// ("2026-10-23T11:00").
export function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A datetime-local value → ISO 8601 for the API; null when empty.
export function dateTimeLocalToIso(value) {
  return value ? new Date(value).toISOString() : null;
}

// Midnight today on this device's clock, as ISO 8601 (e.g. "calls today").
export function startOfTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}
