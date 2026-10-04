import { NOTIFICATIONS } from "@/lib/data";
import { MIcon } from "@/components/MobileUI";

// Picks an icon/tone for an alert from its wording.
function kind(text) {
  const t = text.toLowerCase();
  if (t.includes("not submitted") || t.includes("pending approval")) return { icon: "alert", tone: "risk" };
  if (t.includes("pending")) return { icon: "bell", tone: "warn" };
  return { icon: "check", tone: "ok" };
}

export default function MobileNotificationsPage() {
  return (
    <div>
      <h1 className="wf-mtitle">Alerts</h1>
      <p className="wf-msub">Site and approval updates relevant to you.</p>

      <div className="wf-mlist">
        {NOTIFICATIONS.map((n, i) => {
          const k = kind(n.text);
          return (
            <div key={i} className="wf-malert">
              <span className={`wf-malert-icon ${k.tone}`}>
                <MIcon name={k.icon} size={17} />
              </span>
              <span className="wf-malert-body">
                <span className="wf-malert-text">{n.text}</span>
                <span className="wf-malert-when">{n.when}</span>
              </span>
              {i < 2 && <span className="wf-malert-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
