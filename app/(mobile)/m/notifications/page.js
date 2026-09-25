import { NOTIFICATIONS } from "@/lib/data";

export default function MobileNotificationsPage() {
  return (
    <div>
      <h1 className="wf-h1">Alerts</h1>
      <p className="wf-sub">Site & approval updates relevant to you.</p>

      {NOTIFICATIONS.map((n, i) => (
        <div key={i} className="wf-mcard">
          <div className="wf-mcard-title" style={{ fontWeight: 500 }}>
            {n.text}
          </div>
          <div className="wf-mcard-sub">{n.when}</div>
        </div>
      ))}
    </div>
  );
}
