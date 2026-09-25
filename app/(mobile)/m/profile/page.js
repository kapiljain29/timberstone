import Link from "next/link";
import { Box } from "@/components/ui";

export default function MobileProfilePage() {
  return (
    <div>
      <h1 className="wf-h1">Profile</h1>

      <Box title="Logged in as">
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14 }}>Ramesh Kadam</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
          Supervisor · Site Execution &amp; Design Collaboration
        </p>
      </Box>

      <Box title="This app covers">
        <ul className="wf-list">
          <li>
            <span>Step 4 — Product, Design &amp; Sample Selection</span>
          </li>
          <li>
            <span>Step 5 — Measurement Sheet &amp; Final Quotation</span>
          </li>
          <li>
            <span>Step 8 — Material Delivery &amp; Delivery Challan</span>
          </li>
          <li>
            <span>Step 9 — Daily Site Readiness Checklist</span>
          </li>
          <li>
            <span>Step 10 — Contractor Allocation</span>
          </li>
          <li>
            <span>Step 11 — Daily Supervision Report (DSR)</span>
          </li>
          <li>
            <span>Step 12 — Final Measurement &amp; Closure</span>
          </li>
        </ul>
      </Box>

      <Link href="/" className="wf-btn ghost" style={{ marginTop: 6 }}>
        ⇦ Exit to Role Hub / Switch Role
      </Link>
    </div>
  );
}
