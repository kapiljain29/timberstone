import Link from "next/link";
import { MIcon, MSectionTitle } from "@/components/MobileUI";

const COVERED_STEPS = [
  { n: 4, title: "Product, Design & Sample Selection", icon: "projects" },
  { n: 5, title: "Measurement Sheet & Final Quotation", icon: "ruler" },
  { n: 8, title: "Material Delivery & Delivery Challan", icon: "truck" },
  { n: 9, title: "Daily Site Readiness Checklist", icon: "checklist" },
  { n: 10, title: "Contractor Allocation", icon: "user" },
  { n: 11, title: "Daily Supervision Report (DSR)", icon: "dsr" },
  { n: 12, title: "Final Measurement & Closure", icon: "check" },
];

export default function MobileProfilePage() {
  return (
    <div>
      <div className="wf-mprofile">
        <span className="wf-mprofile-avatar">RK</span>
        <div className="wf-mprofile-name">Ramesh Kadam</div>
        <div className="wf-mprofile-role">Site Supervisor · Jaipur</div>
        <div className="wf-mprofile-tags">
          <span>Site Execution</span>
          <span>Design Collaboration</span>
        </div>
      </div>

      <MSectionTitle>Steps you handle</MSectionTitle>
      <div className="wf-mlist">
        {COVERED_STEPS.map((s) => (
          <div key={s.n} className="wf-mlist-row">
            <span className="wf-mlist-icon">
              <MIcon name={s.icon} size={18} />
            </span>
            <span className="wf-mlist-text">{s.title}</span>
            <span className="wf-mlist-step">Step {s.n}</span>
          </div>
        ))}
      </div>

      <Link href="/" className="wf-mexit">
        <MIcon name="exit" size={18} /> Switch role
      </Link>
    </div>
  );
}
