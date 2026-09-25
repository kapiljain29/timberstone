"use client";

import { Box, DataTable } from "@/components/ui";
import { NOTIFICATIONS } from "@/lib/data";

const EVENT_TYPES = [
  "New lead / new project created",
  "Quotation ready for review",
  "Sample approval pending",
  "Measurement approval pending",
  "Customer quotation approval pending",
  "Work Order generated",
  "Material delivery pending",
  "Site readiness pending",
  "Start approval pending",
  "DSR not submitted",
  "Project completion / handover pending",
  "Payment milestone due or outstanding",
];

export default function NotificationsPage() {
  return (
    <div>
      <div className="wf-crumb">Reference</div>
      <h1 className="wf-h1">Notifications & Approvals</h1>
      <p className="wf-sub">Section 9 of the proposal — role-based notifications for key workflow events.</p>

      <Box title="Recent Notifications (mock)">
        <DataTable columns={["Notification", "When"]} rows={NOTIFICATIONS.map((n) => [n.text, n.when])} />
      </Box>

      <Box title="Configured Notification Events">
        <ul className="wf-list">
          {EVENT_TYPES.map((e) => (
            <li key={e}>
              <span>{e}</span>
              <span className="wf-badge idle">role-based</span>
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}
