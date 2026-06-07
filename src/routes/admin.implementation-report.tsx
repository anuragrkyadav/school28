import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CircleDashed, Sparkles, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/module-shell";
import { getRolePath, isAdminPortalRole, useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/implementation-report")({
  component: ImplementationReportPage,
});

type SectionItem = {
  title: string;
  status: string;
  tone: "green" | "amber" | "blue";
};

type SectionGroup = {
  title: string;
  items: SectionItem[];
};

const reportGroups: SectionGroup[] = [
  {
    title: "Admin (key partials)",
    items: [
      {
        title: "White-label branding",
        status: "School has logoUrl, no theme customization UI",
        tone: "amber",
      },
      { title: "Subject management", status: "DB schema exists, UI not built", tone: "amber" },
      { title: "School calendar", status: "Route exists, not fully implemented", tone: "amber" },
      {
        title: "Role & permission customization",
        status: "RBAC framework ready, UI incomplete",
        tone: "blue",
      },
      { title: "Admission Management (6 features)", status: "No routes/UI built", tone: "blue" },
      {
        title: "Staff Management (6 features)",
        status: "Attendance exists, leave requests partial",
        tone: "blue",
      },
      {
        title: "Online payment gateway",
        status: "UPI/card infrastructure ready, not integrated",
        tone: "green",
      },
      { title: "Audit logs", status: "Infrastructure exists, no audit UI", tone: "blue" },
    ],
  },
  {
    title: "Teacher (key partials)",
    items: [
      {
        title: "QR code / ID card scan attendance",
        status: "Infrastructure ready, scanning not built",
        tone: "amber",
      },
      { title: "Syllabus & Lesson Plans", status: "Routes exist, UI incomplete", tone: "blue" },
      {
        title: "Generate report cards",
        status: "Templates ready, auto-generation not implemented",
        tone: "blue",
      },
      { title: "Behavior & Discipline", status: "Route exists, features partial", tone: "blue" },
      { title: "Video call with parents", status: "Not implemented", tone: "green" },
    ],
  },
  {
    title: "Parent (key partials)",
    items: [
      {
        title: "Bus Tracking (8 features)",
        status: "GPS infrastructure exists, map UI not built",
        tone: "amber",
      },
      {
        title: "Chat & video with teacher",
        status: "Infrastructure ready, UI incomplete",
        tone: "blue",
      },
      { title: "Parent-teacher meeting scheduler", status: "Not implemented", tone: "green" },
      {
        title: "Automated reminders",
        status: "Infrastructure exists, scheduling not built",
        tone: "amber",
      },
      {
        title: "Fee payment via multiple methods",
        status: "Gateway ready, integration incomplete",
        tone: "amber",
      },
      { title: "Canteen wallet", status: "Structure ready, UI not built", tone: "blue" },
    ],
  },
];

function StatusMarker({ tone }: { tone: SectionItem["tone"] }) {
  const map = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
  } as const;

  return <span className={`ml-2 inline-flex h-2.5 w-2.5 rounded-full ${map[tone]}`} aria-hidden />;
}

function SectionCard({ group }: { group: SectionGroup }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-[#d97b08] px-6 py-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">{group.title}</h2>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <ul className="space-y-3 text-sm leading-6 text-foreground">
          {group.items.map((item) => (
            <li key={item.title} className="flex items-start gap-2">
              <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              <span className="min-w-0">
                <span className="font-medium">{item.title}</span>
                <span className="mx-2 text-muted-foreground">-</span>
                <span>{item.status}</span>
                <StatusMarker tone={item.tone} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ImplementationReportPage() {
  const { user, authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading report...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  if (!isAdminPortalRole(user.role)) {
    return <Navigate to={getRolePath(user.role, user.schoolId)} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Partially Implemented - Backend Ready, UI Missing"
        subtitle="These features already have schemas, server functions, or context logic. They just need frontend UI components to become fully functional."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin"
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/admin/school"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open School Setup
            </Link>
          </div>
        }
      />

      <div className="mb-8 border-b-4 border-[#284563] pb-5">
        <p className="max-w-4xl text-base leading-7 text-muted-foreground sm:text-lg">
          This report highlights the parts of the ERP where the backend, DB schema, or context logic
          already exists. The remaining work is primarily user experience and front-end wiring.
        </p>
      </div>

      <div className="space-y-8">
        {reportGroups.map((group) => (
          <SectionCard key={group.title} group={group} />
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Ready pieces
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Backend services, routes, and schemas are already in place.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CircleDashed className="h-4 w-4 text-amber-500" />
            UI gaps
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Most items here need screens, forms, and navigation only.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-sky-500" />
            Next step
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            We can tackle one section at a time without changing architecture.
          </p>
        </div>
      </div>
    </div>
  );
}
