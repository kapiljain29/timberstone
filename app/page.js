import Link from "next/link";
import { stepsOwnedBy, stepsSupportedBy } from "@/lib/stages";

const ROLE_CARDS = [
  {
    department: "Manager",
    label: "Executive Dashboard",
    badge: "Executive",
    badgeColor: "#a35b00",
    icon: "👑",
    description: "Dashboard, pipeline, payment-term & closure approvals, credit notes.",
    href: "/dashboard",
    highlight: true,
  },
  {
    department: "Sales",
    label: "Sales / Pre-Sales",
    badge: "Pre-Sales",
    badgeColor: "#3e7a52",
    icon: "📞",
    description: "Leads, rough estimates, measurement booking & advance payment.",
    href: "/leads",
  },
  {
    department: "Supervisor",
    label: "Supervisor",
    badge: "Mobile App",
    badgeColor: "#3e5743",
    icon: "📱",
    description:
      "Samples, measurement sheet, site readiness, contractors, DSR — delivered as a mobile app for on-site use.",
    href: "/m",
  },
  {
    department: "Design",
    label: "Design",
    badge: "Design",
    badgeColor: "#a24fa0",
    icon: "🎨",
    description: "Product code, JPEG/DWG files, sample approvals with Supervisor.",
    href: "/projects",
  },
  {
    department: "Accounts",
    label: "Accounts",
    badge: "Accounts",
    badgeColor: "#1f9b91",
    icon: "💰",
    description: "Work order, delivery challan, payment terms, closure & credit notes.",
    href: "/projects",
  },
  {
    department: "Marketing",
    label: "Marketing",
    badge: "Marketing",
    badgeColor: "#7a5cd6",
    icon: "📣",
    description: "Lead sources, campaigns, and initial lead intake.",
    href: "/leads",
  },
];

export default function RoleHubPage() {
  return (
    <div className="wf-landing">
      <div className="wf-landing-inner">
        <div className="wf-landing-header">
          <div className="wf-landing-logo">T</div>
          <h1 className="wf-landing-title">Timberstone ERP</h1>
          <p className="wf-landing-sub">Lead-to-Handover Platform</p>
          <span className="wf-landing-live">
            <span className="dot" />
            Interactive wireframe · mock data
          </span>
          <div className="wf-landing-actions">
            <Link href="/dashboard" className="wf-landing-btn primary">
              Enter Dashboard
            </Link>
            <Link href="/roles" className="wf-landing-btn ghost">
              Role-wise Workflow
            </Link>
          </div>
        </div>

        <p className="wf-landing-prompt">Or jump directly to a role for demo:</p>

        {ROLE_CARDS.map((role) => {
          const ownedCount = stepsOwnedBy(role.department).length;
          const supportedCount = stepsSupportedBy(role.department).length;
          const stepNote =
            ownedCount > 0
              ? `Owns ${ownedCount} step${ownedCount > 1 ? "s" : ""} of 12`
              : supportedCount > 0
                ? `Collaborates on ${supportedCount} step${supportedCount > 1 ? "s" : ""} of 12`
                : "";
          return (
            <Link
              key={role.department}
              href={role.href}
              className={`wf-role-card${role.highlight ? " highlight" : ""}`}
            >
              <span className="wf-role-card-icon">{role.icon}</span>
              <span className="wf-role-card-body">
                <span className="wf-role-card-title">
                  {role.label}
                  <span className="wf-role-pill-badge" style={{ background: role.badgeColor }}>
                    {role.badge}
                  </span>
                </span>
                <span className="wf-role-card-desc">
                  {role.description}
                  {stepNote ? ` · ${stepNote}` : ""}
                </span>
              </span>
              <span className="wf-role-card-chevron">›</span>
            </Link>
          );
        })}

        <p className="wf-landing-footer">Fullestop Technology · Timberstone ERP wireframe v1.0</p>
      </div>
    </div>
  );
}
