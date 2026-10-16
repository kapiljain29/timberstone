// The reset link carries a one-time token in the URL — never send it to
// other sites in the Referer header.
export const metadata = {
  title: "Reset password — Timberstone ERP",
  referrer: "no-referrer",
};

export default function ResetPasswordLayout({ children }) {
  return children;
}
