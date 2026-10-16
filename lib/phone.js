// Phone helpers shared by every form / list with a phone number. The
// country code list comes from the API (`country_codes` in each form's
// /master): [{ value: "+91", label, iso, min_length, max_length, default }].

// The list's default code (the one with default: true), or "" while loading.
export function defaultCountryCode(countryCodes) {
  return (countryCodes || []).find((c) => c.default)?.value || "";
}

// "+91 9829010009" for display; "—" when there is no number.
export function formatPhone(countryCode, number) {
  if (!number) return "—";
  return countryCode ? `${countryCode} ${number}` : number;
}

// Placeholder for the number input, e.g. "10 digits" for +91.
export function phonePlaceholder(countryCodes, code) {
  const country = (countryCodes || []).find((c) => c.value === code);
  if (!country) return "Mobile number";
  const digits =
    country.min_length === country.max_length ? country.min_length : `${country.min_length}–${country.max_length}`;
  return `${digits} digits`;
}
