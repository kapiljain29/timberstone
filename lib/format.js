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

// Today on this device's clock as an <input type="date"> value
// ("2026-10-25") — e.g. a payment date's default and maximum.
export function todayDate() {
  return toDateTimeLocal(new Date()).slice(0, 10);
}

// An amount in rupees for display: 10000 → "₹10,000", 2500.5 → "₹2,500.50".
export function formatAmount(amount) {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
