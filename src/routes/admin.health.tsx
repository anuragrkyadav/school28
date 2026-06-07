import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertOctagon,
  BellRing,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Pill,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  User,
  Syringe,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/module-shell";
import { apiClient } from "@/lib/api-client";

type TabKey =
  | "profiles"
  | "vaccinations"
  | "visits"
  | "medications"
  | "incidents"
  | "alerts"
  | "checkups";

interface HealthProfile {
  id: string;
  studentName: string;
  grade: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  vaccinationStatus: "Fully Vaccinated" | "Pending Doses" | "Exempt";
  parentName: string;
  emergencyContact: string;
  notes?: string;
}

interface VaccinationRecord {
  id: string;
  studentName: string;
  vaccineName: string;
  doseNumber: string;
  administrationDate: string;
  nextDueDate?: string;
  provider?: string;
  status: "Fully Vaccinated" | "Pending Doses" | "Exempt";
  notes?: string;
}

interface ClinicLog {
  id: string;
  studentName: string;
  grade: string;
  visitDate: string;
  temperature?: string;
  symptoms: string;
  treatment: string;
  status: "Resting in Infirmary" | "Discharged to Class" | "Sent Home with Parent";
  guardianNotified: boolean;
  nurseName?: string;
  doctorName?: string;
  followUpRequired: boolean;
}

interface MedicationRecord {
  id: string;
  studentName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  notes?: string;
}

interface IncidentReport {
  id: string;
  studentName: string;
  incidentDate: string;
  location?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  actionTaken: string;
  reportedBy: string;
  parentNotified: boolean;
  status: "OPEN" | "RESOLVED" | "ESCALATED";
}

interface HealthAlert {
  id: string;
  studentName: string;
  parentName: string;
  parentContact: string;
  alertType: string;
  channel: "SMS" | "APP" | "EMAIL";
  message: string;
  status: "QUEUED" | "SENT" | "FAILED";
  sentAt?: string;
}

interface AnnualHealthCheckup {
  id: string;
  studentName: string;
  academicYear: string;
  checkupDate: string;
  provider?: string;
  heightCm?: string;
  weightKg?: string;
  vision?: string;
  hearing?: string;
  clearanceStatus: "CLEARED" | "FOLLOW_UP" | "RESTRICTED";
  followUpDate?: string;
  notes?: string;
}

interface MedicalDashboard {
  profiles: HealthProfile[];
  vaccinations: VaccinationRecord[];
  visits: ClinicLog[];
  medications: MedicationRecord[];
  incidents: IncidentReport[];
  alerts: HealthAlert[];
  checkups: AnnualHealthCheckup[];
}

interface DashboardResponse extends MedicalDashboard {
  summary?: {
    profiles: number;
    vaccinations: number;
    visits: number;
    medications: number;
    incidents: number;
    alerts: number;
    checkups: number;
    followUps: number;
  };
}

type ApiRecord = {
  _id?: string;
  id?: string;
  [key: string]: unknown;
};

interface TableColumn {
  label: string;
  align?: "left" | "right";
}

const tabConfig: Array<{ key: TabKey; label: string; icon: typeof Activity }> = [
  { key: "profiles", label: "Student Profiles", icon: FileSpreadsheet },
  { key: "vaccinations", label: "Vaccinations", icon: Syringe },
  { key: "visits", label: "Nurse / Doctor Visits", icon: Stethoscope },
  { key: "medications", label: "Medication Tracker", icon: Pill },
  { key: "incidents", label: "Incident Reports", icon: AlertOctagon },
  { key: "alerts", label: "Parent Alerts", icon: BellRing },
  { key: "checkups", label: "Annual Checkups", icon: ShieldCheck },
];

const demoDashboard = (): MedicalDashboard => ({
  profiles: [
    {
      id: "hp1",
      studentName: "Aarav Sharma",
      grade: "Grade 6-A",
      bloodGroup: "O+",
      allergies: ["Peanuts", "Gluten"],
      chronicConditions: ["Mild Asthma"],
      vaccinationStatus: "Fully Vaccinated",
      parentName: "Ramesh Sharma",
      emergencyContact: "+91 99887 11223",
      notes: "Inhaler kept in infirmary cabinet",
    },
    {
      id: "hp2",
      studentName: "Rohan Das",
      grade: "Grade 11-C",
      bloodGroup: "AB-",
      allergies: ["Sulfonamide drugs", "Soy"],
      chronicConditions: [],
      vaccinationStatus: "Pending Doses",
      parentName: "Sanjay Das",
      emergencyContact: "+91 88776 22334",
      notes: "Needs annual booster follow-up",
    },
  ],
  vaccinations: [
    {
      id: "vac1",
      studentName: "Aarav Sharma",
      vaccineName: "Tdap Booster",
      doseNumber: "1",
      administrationDate: "2026-05-12",
      nextDueDate: "2027-05-12",
      provider: "City Health Center",
      status: "Fully Vaccinated",
    },
    {
      id: "vac2",
      studentName: "Rohan Das",
      vaccineName: "MMR",
      doseNumber: "2",
      administrationDate: "2025-12-01",
      nextDueDate: "2026-06-15",
      provider: "School Clinic",
      status: "Pending Doses",
    },
  ],
  visits: [
    {
      id: "cl1",
      studentName: "Aarav Sharma",
      grade: "Grade 6-A",
      visitDate: "2026-06-07T10:15:00",
      temperature: "99.2 F",
      symptoms: "Mild headache and fatigue",
      treatment: "Cold compress and rest in infirmary",
      status: "Discharged to Class",
      guardianNotified: true,
      nurseName: "Nurse Priya",
      followUpRequired: false,
    },
    {
      id: "cl2",
      studentName: "Rohan Das",
      grade: "Grade 11-C",
      visitDate: "2026-06-07T13:10:00",
      temperature: "101.4 F",
      symptoms: "High fever and chills",
      treatment: "Observed, hydrated, sent home with parent",
      status: "Sent Home with Parent",
      guardianNotified: false,
      doctorName: "Dr. Khan",
      followUpRequired: true,
    },
  ],
  medications: [
    {
      id: "med1",
      studentName: "Kabir Mehta",
      medicationName: "Insulin",
      dosage: "5 units",
      frequency: "Before lunch",
      prescribedBy: "Dr. Sharma",
      startDate: "2026-01-10",
      status: "ACTIVE",
      notes: "Stored in refrigerated cabinet",
    },
  ],
  incidents: [
    {
      id: "inc1",
      studentName: "Meera Nair",
      incidentDate: "2026-06-06",
      location: "Playground",
      severity: "MEDIUM",
      description: "Slipped while running and bruised knee",
      actionTaken: "First aid applied and ice pack used",
      reportedBy: "Admin Office",
      parentNotified: true,
      status: "RESOLVED",
    },
  ],
  alerts: [
    {
      id: "al1",
      studentName: "Rohan Das",
      parentName: "Sanjay Das",
      parentContact: "+91 88776 22334",
      alertType: "Fever alert",
      channel: "SMS",
      message: "Student sent home due to fever. Please monitor temperature closely.",
      status: "SENT",
      sentAt: "2026-06-07T13:20:00",
    },
  ],
  checkups: [
    {
      id: "chk1",
      studentName: "Aarav Sharma",
      academicYear: "2025-26",
      checkupDate: "2026-04-18",
      provider: "City Health Center",
      heightCm: "138",
      weightKg: "34",
      vision: "6/6",
      hearing: "Normal",
      clearanceStatus: "CLEARED",
    },
    {
      id: "chk2",
      studentName: "Rohan Das",
      academicYear: "2025-26",
      checkupDate: "2026-04-18",
      provider: "City Health Center",
      heightCm: "164",
      weightKg: "52",
      vision: "6/9",
      hearing: "Normal",
      clearanceStatus: "FOLLOW_UP",
      followUpDate: "2026-06-20",
      notes: "Vision re-test required",
    },
  ],
});

function normalizeDashboard(data?: Partial<DashboardResponse>): MedicalDashboard {
  return {
    profiles: (data?.profiles ?? []).map((item) => normalizeProfile(item as ApiRecord)),
    vaccinations: (data?.vaccinations ?? []).map((item) => normalizeVaccination(item as ApiRecord)),
    visits: (data?.visits ?? []).map((item) => normalizeVisit(item as ApiRecord)),
    medications: (data?.medications ?? []).map((item) => normalizeMedication(item as ApiRecord)),
    incidents: (data?.incidents ?? []).map((item) => normalizeIncident(item as ApiRecord)),
    alerts: (data?.alerts ?? []).map((item) => normalizeAlert(item as ApiRecord)),
    checkups: (data?.checkups ?? []).map((item) => normalizeCheckup(item as ApiRecord)),
  };
}

function recordId(item: ApiRecord) {
  return String(item.id ?? item._id ?? "");
}

function normalizeProfile(item: ApiRecord): HealthProfile {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    grade: String(item.grade ?? ""),
    bloodGroup: String(item.bloodGroup ?? ""),
    allergies: Array.isArray(item.allergies) ? item.allergies.map((value) => String(value)) : [],
    chronicConditions: Array.isArray(item.chronicConditions)
      ? item.chronicConditions.map((value) => String(value))
      : [],
    vaccinationStatus:
      (item.vaccinationStatus as HealthProfile["vaccinationStatus"]) ?? "Pending Doses",
    parentName: String(item.parentName ?? ""),
    emergencyContact: String(item.emergencyContact ?? ""),
    notes: item.notes ? String(item.notes) : undefined,
  };
}

function normalizeVaccination(item: ApiRecord): VaccinationRecord {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    vaccineName: String(item.vaccineName ?? ""),
    doseNumber: String(item.doseNumber ?? ""),
    administrationDate: String(item.administrationDate ?? ""),
    nextDueDate: item.nextDueDate ? String(item.nextDueDate) : undefined,
    provider: item.provider ? String(item.provider) : undefined,
    status: (item.status as VaccinationRecord["status"]) ?? "Pending Doses",
    notes: item.notes ? String(item.notes) : undefined,
  };
}

function normalizeVisit(item: ApiRecord): ClinicLog {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    grade: String(item.grade ?? ""),
    visitDate: String(item.visitDate ?? ""),
    temperature: item.temperature ? String(item.temperature) : undefined,
    symptoms: String(item.symptoms ?? ""),
    treatment: String(item.treatment ?? ""),
    status: (item.status as ClinicLog["status"]) ?? "Discharged to Class",
    guardianNotified: Boolean(item.guardianNotified),
    nurseName: item.nurseName ? String(item.nurseName) : undefined,
    doctorName: item.doctorName ? String(item.doctorName) : undefined,
    followUpRequired: Boolean(item.followUpRequired),
  };
}

function normalizeMedication(item: ApiRecord): MedicationRecord {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    medicationName: String(item.medicationName ?? ""),
    dosage: String(item.dosage ?? ""),
    frequency: String(item.frequency ?? ""),
    prescribedBy: item.prescribedBy ? String(item.prescribedBy) : undefined,
    startDate: item.startDate ? String(item.startDate) : undefined,
    endDate: item.endDate ? String(item.endDate) : undefined,
    status: (item.status as MedicationRecord["status"]) ?? "ACTIVE",
    notes: item.notes ? String(item.notes) : undefined,
  };
}

function normalizeIncident(item: ApiRecord): IncidentReport {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    incidentDate: String(item.incidentDate ?? ""),
    location: item.location ? String(item.location) : undefined,
    severity: (item.severity as IncidentReport["severity"]) ?? "MEDIUM",
    description: String(item.description ?? ""),
    actionTaken: String(item.actionTaken ?? ""),
    reportedBy: String(item.reportedBy ?? "Admin"),
    parentNotified: Boolean(item.parentNotified),
    status: (item.status as IncidentReport["status"]) ?? "OPEN",
  };
}

function normalizeAlert(item: ApiRecord): HealthAlert {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    parentName: String(item.parentName ?? ""),
    parentContact: String(item.parentContact ?? ""),
    alertType: String(item.alertType ?? ""),
    channel: (item.channel as HealthAlert["channel"]) ?? "SMS",
    message: String(item.message ?? ""),
    status: (item.status as HealthAlert["status"]) ?? "QUEUED",
    sentAt: item.sentAt ? String(item.sentAt) : undefined,
  };
}

function normalizeCheckup(item: ApiRecord): AnnualHealthCheckup {
  return {
    id: recordId(item),
    studentName: String(item.studentName ?? ""),
    academicYear: String(item.academicYear ?? ""),
    checkupDate: String(item.checkupDate ?? ""),
    provider: item.provider ? String(item.provider) : undefined,
    heightCm: item.heightCm ? String(item.heightCm) : undefined,
    weightKg: item.weightKg ? String(item.weightKg) : undefined,
    vision: item.vision ? String(item.vision) : undefined,
    hearing: item.hearing ? String(item.hearing) : undefined,
    clearanceStatus: (item.clearanceStatus as AnnualHealthCheckup["clearanceStatus"]) ?? "CLEARED",
    followUpDate: item.followUpDate ? String(item.followUpDate) : undefined,
    notes: item.notes ? String(item.notes) : undefined,
  };
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinList(values: string[]) {
  return values.length ? values.join(", ") : "None";
}

function lower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function matchesQuery(tab: TabKey, item: any, query: string) {
  if (!query) return true;
  const haystack = (() => {
    switch (tab) {
      case "profiles":
        return [
          item.studentName,
          item.grade,
          item.bloodGroup,
          item.parentName,
          item.emergencyContact,
          item.allergies?.join(" "),
          item.chronicConditions?.join(" "),
          item.notes,
        ].join(" ");
      case "vaccinations":
        return [
          item.studentName,
          item.vaccineName,
          item.doseNumber,
          item.provider,
          item.status,
          item.notes,
        ].join(" ");
      case "visits":
        return [
          item.studentName,
          item.grade,
          item.temperature,
          item.symptoms,
          item.treatment,
          item.status,
          item.nurseName,
          item.doctorName,
        ].join(" ");
      case "medications":
        return [
          item.studentName,
          item.medicationName,
          item.dosage,
          item.frequency,
          item.prescribedBy,
          item.status,
          item.notes,
        ].join(" ");
      case "incidents":
        return [
          item.studentName,
          item.location,
          item.severity,
          item.description,
          item.actionTaken,
          item.reportedBy,
          item.status,
        ].join(" ");
      case "alerts":
        return [
          item.studentName,
          item.parentName,
          item.parentContact,
          item.alertType,
          item.channel,
          item.message,
          item.status,
        ].join(" ");
      case "checkups":
        return [
          item.studentName,
          item.academicYear,
          item.provider,
          item.vision,
          item.hearing,
          item.clearanceStatus,
          item.notes,
        ].join(" ");
      default:
        return "";
    }
  })();
  return lower(haystack).includes(query);
}

function TableShell<T>({
  columns,
  rows,
  renderRow,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  columns: TableColumn[];
  rows: T[];
  renderRow: (row: T) => ReactNode;
  emptyIcon: typeof Activity;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  className={`px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{rows.map(renderRow)}</tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="border-t border-border p-6">
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/health")({
  head: () => ({ meta: [{ title: "Health & Medical · Campus OS" }] }),
  component: HealthSuitePage,
});

function HealthSuitePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profiles");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dashboard, setDashboard] = useState<MedicalDashboard>(() => demoDashboard());

  const activeConfig = tabConfig.find((tab) => tab.key === activeTab) ?? tabConfig[0];
  const query = searchQuery.trim().toLowerCase();

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<DashboardResponse>("/medical");
      setDashboard(normalizeDashboard(data));
    } catch (error) {
      console.error("Failed to load health dashboard", error);
      setDashboard(demoDashboard());
      toast.info("Showing demo health data", {
        description:
          "The backend API was unavailable, so the dashboard fell back to local sample records.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const refreshDashboard = async () => {
    try {
      const data = await apiClient<DashboardResponse>("/medical");
      setDashboard(normalizeDashboard(data));
    } catch (error) {
      console.error("Failed to refresh health dashboard", error);
    }
  };

  const recordsMap = {
    profiles: dashboard.profiles,
    vaccinations: dashboard.vaccinations,
    visits: dashboard.visits,
    medications: dashboard.medications,
    incidents: dashboard.incidents,
    alerts: dashboard.alerts,
    checkups: dashboard.checkups,
  };

  const activeRecords = recordsMap[activeTab].filter((item) =>
    matchesQuery(activeTab, item, query),
  );

  const summary = {
    profiles: dashboard.profiles.length,
    vaccinationsPending: dashboard.vaccinations.filter((item) => item.status !== "Fully Vaccinated")
      .length,
    visits: dashboard.visits.length,
    medications: dashboard.medications.filter((item) => item.status === "ACTIVE").length,
    incidents: dashboard.incidents.filter((item) => item.status !== "RESOLVED").length,
    alerts: dashboard.alerts.filter((item) => item.status === "SENT").length,
    checkups: dashboard.checkups.filter((item) => item.clearanceStatus !== "CLEARED").length,
  };

  const openCreateModal = () => setShowModal(true);
  const closeCreateModal = () => setShowModal(false);

  const handleCreateRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData(event.currentTarget);
    const payload = buildPayload(activeTab, fd);

    try {
      await apiClient(`/medical/${activeTab}`, {
        method: "POST",
        data: payload,
      });
      toast.success(`${activeConfig.label} created`, {
        description: "The record has been saved to the backend and refreshed in the dashboard.",
      });
      event.currentTarget.reset();
      setShowModal(false);
      await refreshDashboard();
    } catch (error) {
      console.error("Failed to create medical record", error);
      toast.error("Could not save record", {
        description: "Please check the form and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health & Medical"
        subtitle="Manage student medical profiles, vaccinations, clinic visits, medications, incidents, parent alerts, and annual checkups."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Student Health Profiles"
          value={String(summary.profiles)}
          icon={FileSpreadsheet}
          tone="info"
        />
        <StatCard
          label="Pending Vaccinations"
          value={String(summary.vaccinationsPending)}
          icon={Syringe}
          tone="warning"
        />
        <StatCard
          label="Active Medications"
          value={String(summary.medications)}
          icon={Pill}
          tone="default"
        />
        <StatCard
          label="Parent Alerts Sent"
          value={String(summary.alerts)}
          icon={Send}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabConfig.map((tab) => {
          const isActive = tab.key === activeTab;
          const count = recordsMap[tab.key].length;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Panel
        title={activeConfig.label}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        }
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Search across the current module by student, parent, or record details.
          </p>
          <div className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </Panel>

      <Panel title={`${activeConfig.label} Directory`}>
        {renderActiveTable(activeTab, activeRecords)}
      </Panel>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeCreateModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Add {activeConfig.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save a new health record directly into the backend module.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              {activeTab === "profiles" && renderProfileForm()}
              {activeTab === "vaccinations" && renderVaccinationForm()}
              {activeTab === "visits" && renderVisitForm()}
              {activeTab === "medications" && renderMedicationForm()}
              {activeTab === "incidents" && renderIncidentForm()}
              {activeTab === "alerts" && renderAlertForm()}
              {activeTab === "checkups" && renderCheckupForm()}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function renderActiveTable(tab: TabKey, records: any[]) {
    switch (tab) {
      case "profiles":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Blood Group" },
              { label: "Allergies" },
              { label: "Conditions" },
              { label: "Vaccination" },
              { label: "Parent" },
              { label: "Contact", align: "right" },
            ]}
            rows={records}
            emptyIcon={FileSpreadsheet}
            emptyTitle="No student profiles found"
            emptyDescription="Create a medical profile to begin tracking allergies, blood group, and conditions."
            renderRow={(profile: HealthProfile) => (
              <tr key={profile.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{profile.studentName}</div>
                      <div className="text-xs text-muted-foreground">{profile.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">
                  {profile.bloodGroup}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {joinList(profile.allergies)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {joinList(profile.chronicConditions)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      profile.vaccinationStatus === "Fully Vaccinated"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : profile.vaccinationStatus === "Exempt"
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    {profile.vaccinationStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {profile.parentName}
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono text-muted-foreground">
                  {profile.emergencyContact}
                </td>
              </tr>
            )}
          />
        );

      case "vaccinations":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Vaccine" },
              { label: "Dose" },
              { label: "Administered" },
              { label: "Next Due" },
              { label: "Provider" },
              { label: "Status", align: "right" },
            ]}
            rows={records}
            emptyIcon={Syringe}
            emptyTitle="No vaccination records found"
            emptyDescription="Log dose history and upcoming vaccine due dates for the student."
            renderRow={(record: VaccinationRecord) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{record.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.vaccineName}</td>
                <td className="px-4 py-3 font-mono text-xs">{record.doseNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(record.administrationDate)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(record.nextDueDate)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{record.provider || "N/A"}</td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {record.status}
                  </span>
                </td>
              </tr>
            )}
          />
        );

      case "visits":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Visit Time" },
              { label: "Temperature" },
              { label: "Symptoms" },
              { label: "Treatment" },
              { label: "Status" },
              { label: "Guardian", align: "right" },
            ]}
            rows={records}
            emptyIcon={Stethoscope}
            emptyTitle="No infirmary visits yet"
            emptyDescription="Create a nurse or doctor log for today's clinic visit history."
            renderRow={(visit: ClinicLog) => (
              <tr key={visit.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-semibold">{visit.studentName}</div>
                  <div className="text-xs text-muted-foreground">{visit.grade}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(visit.visitDate)}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{visit.temperature || "N/A"}</td>
                <td className="px-4 py-3 text-muted-foreground">{visit.symptoms}</td>
                <td className="px-4 py-3 text-muted-foreground">{visit.treatment}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {visit.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {visit.guardianNotified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Notified
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pending</span>
                  )}
                </td>
              </tr>
            )}
          />
        );

      case "medications":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Medication" },
              { label: "Dosage" },
              { label: "Frequency" },
              { label: "Provider" },
              { label: "Dates" },
              { label: "Status", align: "right" },
            ]}
            rows={records}
            emptyIcon={Pill}
            emptyTitle="No medication tracker entries"
            emptyDescription="Track ongoing medication schedules and administration details."
            renderRow={(record: MedicationRecord) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{record.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.medicationName}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.dosage}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.frequency}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.prescribedBy || "N/A"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(record.startDate)}{" "}
                  {record.endDate ? `- ${formatDate(record.endDate)}` : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {record.status}
                  </span>
                </td>
              </tr>
            )}
          />
        );

      case "incidents":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Incident Date" },
              { label: "Severity" },
              { label: "Description" },
              { label: "Action Taken" },
              { label: "Parent", align: "right" },
            ]}
            rows={records}
            emptyIcon={AlertOctagon}
            emptyTitle="No incident reports logged"
            emptyDescription="Capture injuries, behavioral concerns, and other health incidents here."
            renderRow={(record: IncidentReport) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{record.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(record.incidentDate)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      record.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        : record.severity === "HIGH"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                          : record.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    }`}
                  >
                    {record.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{record.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.actionTaken}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <span>{record.reportedBy}</span>
                    <span className="text-xs text-muted-foreground">
                      {record.parentNotified ? "Parent notified" : "Awaiting notice"}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          />
        );

      case "alerts":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Parent" },
              { label: "Channel" },
              { label: "Alert Type" },
              { label: "Message" },
              { label: "Sent At" },
              { label: "Status", align: "right" },
            ]}
            rows={records}
            emptyIcon={BellRing}
            emptyTitle="No parent alerts yet"
            emptyDescription="Send health alerts to guardians when a child needs urgent follow-up."
            renderRow={(record: HealthAlert) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{record.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{record.parentName}</div>
                  <div className="text-xs font-mono">{record.parentContact}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{record.channel}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.alertType}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.message}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(record.sentAt)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Send className="h-3.5 w-3.5" />
                    {record.status}
                  </span>
                </td>
              </tr>
            )}
          />
        );

      case "checkups":
        return (
          <TableShell
            columns={[
              { label: "Student" },
              { label: "Academic Year" },
              { label: "Date" },
              { label: "Provider" },
              { label: "Measurements" },
              { label: "Clearance" },
            ]}
            rows={records}
            emptyIcon={ShieldCheck}
            emptyTitle="No annual health checkups"
            emptyDescription="Record yearly school medical examinations and follow-up dates."
            renderRow={(record: AnnualHealthCheckup) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{record.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.academicYear}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(record.checkupDate)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{record.provider || "N/A"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {record.heightCm ? `H: ${record.heightCm} cm ` : ""}
                  {record.weightKg ? `W: ${record.weightKg} kg ` : ""}
                  {record.vision ? `Vision: ${record.vision} ` : ""}
                  {record.hearing ? `Hearing: ${record.hearing}` : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{record.clearanceStatus}</span>
                    {record.followUpDate && (
                      <span className="text-xs text-muted-foreground">
                        Follow-up: {formatDate(record.followUpDate)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        );
    }
  }

  function buildPayload(tab: TabKey, formData: FormData) {
    const get = (name: string) => String(formData.get(name) ?? "").trim();

    switch (tab) {
      case "profiles":
        return {
          studentName: get("studentName"),
          grade: get("grade"),
          bloodGroup: get("bloodGroup"),
          allergies: get("allergies"),
          chronicConditions: get("chronicConditions"),
          vaccinationStatus: get("vaccinationStatus") || "Pending Doses",
          parentName: get("parentName"),
          emergencyContact: get("emergencyContact"),
          notes: get("notes"),
        };
      case "vaccinations":
        return {
          studentName: get("studentName"),
          vaccineName: get("vaccineName"),
          doseNumber: get("doseNumber"),
          administrationDate: get("administrationDate"),
          nextDueDate: get("nextDueDate"),
          provider: get("provider"),
          status: get("status") || "Pending Doses",
          notes: get("notes"),
        };
      case "visits":
        return {
          studentName: get("studentName"),
          grade: get("grade"),
          visitDate: get("visitDate"),
          temperature: get("temperature"),
          symptoms: get("symptoms"),
          treatment: get("treatment"),
          status: get("status") || "Discharged to Class",
          guardianNotified: formData.get("guardianNotified") === "on",
          nurseName: get("nurseName"),
          doctorName: get("doctorName"),
          followUpRequired: formData.get("followUpRequired") === "on",
        };
      case "medications":
        return {
          studentName: get("studentName"),
          medicationName: get("medicationName"),
          dosage: get("dosage"),
          frequency: get("frequency"),
          prescribedBy: get("prescribedBy"),
          startDate: get("startDate"),
          endDate: get("endDate"),
          status: get("status") || "ACTIVE",
          notes: get("notes"),
        };
      case "incidents":
        return {
          studentName: get("studentName"),
          incidentDate: get("incidentDate"),
          location: get("location"),
          severity: get("severity") || "MEDIUM",
          description: get("description"),
          actionTaken: get("actionTaken"),
          reportedBy: get("reportedBy") || "Admin",
          parentNotified: formData.get("parentNotified") === "on",
          status: get("status") || "OPEN",
        };
      case "alerts":
        return {
          studentName: get("studentName"),
          parentName: get("parentName"),
          parentContact: get("parentContact"),
          alertType: get("alertType"),
          channel: get("channel") || "SMS",
          message: get("message"),
          status: get("status") || "QUEUED",
          sentAt: get("sentAt"),
        };
      case "checkups":
        return {
          studentName: get("studentName"),
          academicYear: get("academicYear"),
          checkupDate: get("checkupDate"),
          provider: get("provider"),
          heightCm: get("heightCm"),
          weightKg: get("weightKg"),
          vision: get("vision"),
          hearing: get("hearing"),
          clearanceStatus: get("clearanceStatus") || "CLEARED",
          followUpDate: get("followUpDate"),
          notes: get("notes"),
        };
    }
  }

  function fieldGroup(label: string, input: ReactNode) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {input}
      </div>
    );
  }

  function inputField(name: string, placeholder: string, type = "text", required = true) {
    return (
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    );
  }

  function selectField(name: string, options: string[], required = true) {
    return (
      <select
        name={name}
        required={required}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  function textareaField(name: string, placeholder: string, rows = 3, required = true) {
    return (
      <textarea
        name={name}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    );
  }

  function checkboxField(name: string, label: string) {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
        <input type="checkbox" name={name} className="h-4 w-4" />
        <span>{label}</span>
      </label>
    );
  }

  function renderProfileForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Aarav Sharma"))}
        {fieldGroup("Grade / Section", inputField("grade", "e.g. Grade 6-A"))}
        {fieldGroup("Blood Group", inputField("bloodGroup", "e.g. O+"))}
        {fieldGroup(
          "Vaccination Status",
          selectField("vaccinationStatus", ["Pending Doses", "Fully Vaccinated", "Exempt"], false),
        )}
        <div className="md:col-span-2">
          {fieldGroup(
            "Allergies",
            textareaField("allergies", "Comma separated allergies, e.g. Peanuts, Dust"),
          )}
        </div>
        <div className="md:col-span-2">
          {fieldGroup(
            "Chronic Conditions",
            textareaField("chronicConditions", "Comma separated conditions, e.g. Asthma, Diabetes"),
          )}
        </div>
        {fieldGroup("Parent / Guardian Name", inputField("parentName", "e.g. Ramesh Sharma"))}
        {fieldGroup("Emergency Contact", inputField("emergencyContact", "e.g. +91 99887 11223"))}
        <div className="md:col-span-2">
          {fieldGroup("Notes", textareaField("notes", "Optional medical notes", 3, false))}
        </div>
      </div>
    );
  }

  function renderVaccinationForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Aarav Sharma"))}
        {fieldGroup("Vaccine Name", inputField("vaccineName", "e.g. Tdap Booster"))}
        {fieldGroup("Dose Number", inputField("doseNumber", "e.g. 1"))}
        {fieldGroup(
          "Status",
          selectField("status", ["Fully Vaccinated", "Pending Doses", "Exempt"], false),
        )}
        {fieldGroup("Administration Date", inputField("administrationDate", "", "date"))}
        {fieldGroup("Next Due Date", inputField("nextDueDate", "", "date", false))}
        {fieldGroup("Provider", inputField("provider", "e.g. City Health Center", "text", false))}
        <div className="md:col-span-2">
          {fieldGroup("Notes", textareaField("notes", "Optional vaccine notes", 3, false))}
        </div>
      </div>
    );
  }

  function renderVisitForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Meera Nair"))}
        {fieldGroup("Grade / Section", inputField("grade", "e.g. Grade 8-A"))}
        {fieldGroup("Visit Date", inputField("visitDate", "", "datetime-local"))}
        {fieldGroup("Temperature", inputField("temperature", "e.g. 99.2 F", "text", false))}
        <div className="md:col-span-2">
          {fieldGroup("Symptoms", textareaField("symptoms", "Describe the complaint"))}
        </div>
        <div className="md:col-span-2">
          {fieldGroup("Treatment", textareaField("treatment", "Action taken / treatment"))}
        </div>
        {fieldGroup(
          "Status",
          selectField(
            "status",
            ["Resting in Infirmary", "Discharged to Class", "Sent Home with Parent"],
            false,
          ),
        )}
        {fieldGroup("Nurse Name", inputField("nurseName", "e.g. Nurse Priya", "text", false))}
        {fieldGroup("Doctor Name", inputField("doctorName", "e.g. Dr. Khan", "text", false))}
        <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
          {checkboxField("guardianNotified", "Guardian notified")}
          {checkboxField("followUpRequired", "Follow-up required")}
        </div>
      </div>
    );
  }

  function renderMedicationForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Kabir Mehta"))}
        {fieldGroup("Medication Name", inputField("medicationName", "e.g. Insulin"))}
        {fieldGroup("Dosage", inputField("dosage", "e.g. 5 units"))}
        {fieldGroup("Frequency", inputField("frequency", "e.g. Before lunch"))}
        {fieldGroup("Prescribed By", inputField("prescribedBy", "e.g. Dr. Sharma", "text", false))}
        {fieldGroup("Status", selectField("status", ["ACTIVE", "PAUSED", "COMPLETED"], false))}
        {fieldGroup("Start Date", inputField("startDate", "", "date", false))}
        {fieldGroup("End Date", inputField("endDate", "", "date", false))}
        <div className="md:col-span-2">
          {fieldGroup("Notes", textareaField("notes", "Optional medication notes", 3, false))}
        </div>
      </div>
    );
  }

  function renderIncidentForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Meera Nair"))}
        {fieldGroup("Incident Date", inputField("incidentDate", "", "date"))}
        {fieldGroup("Location", inputField("location", "e.g. Playground", "text", false))}
        {fieldGroup(
          "Severity",
          selectField("severity", ["MEDIUM", "LOW", "HIGH", "CRITICAL"], false),
        )}
        <div className="md:col-span-2">
          {fieldGroup("Description", textareaField("description", "What happened?"))}
        </div>
        <div className="md:col-span-2">
          {fieldGroup("Action Taken", textareaField("actionTaken", "What was done?"))}
        </div>
        {fieldGroup("Reported By", inputField("reportedBy", "e.g. Admin Office"))}
        {fieldGroup("Status", selectField("status", ["OPEN", "RESOLVED", "ESCALATED"], false))}
        <div className="md:col-span-2">{checkboxField("parentNotified", "Parent notified")}</div>
      </div>
    );
  }

  function renderAlertForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Rohan Das"))}
        {fieldGroup("Parent Name", inputField("parentName", "e.g. Sanjay Das"))}
        {fieldGroup("Parent Contact", inputField("parentContact", "e.g. +91 88776 22334"))}
        {fieldGroup("Alert Type", inputField("alertType", "e.g. Fever alert"))}
        {fieldGroup("Channel", selectField("channel", ["SMS", "APP", "EMAIL"], false))}
        {fieldGroup("Status", selectField("status", ["QUEUED", "SENT", "FAILED"], false))}
        {fieldGroup("Sent At", inputField("sentAt", "", "datetime-local", false))}
        <div className="md:col-span-2">
          {fieldGroup("Message", textareaField("message", "Message to the parent"))}
        </div>
      </div>
    );
  }

  function renderCheckupForm() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fieldGroup("Student Name", inputField("studentName", "e.g. Aarav Sharma"))}
        {fieldGroup("Academic Year", inputField("academicYear", "e.g. 2025-26"))}
        {fieldGroup("Checkup Date", inputField("checkupDate", "", "date"))}
        {fieldGroup("Provider", inputField("provider", "e.g. City Health Center", "text", false))}
        {fieldGroup("Height (cm)", inputField("heightCm", "e.g. 138", "text", false))}
        {fieldGroup("Weight (kg)", inputField("weightKg", "e.g. 34", "text", false))}
        {fieldGroup("Vision", inputField("vision", "e.g. 6/6", "text", false))}
        {fieldGroup("Hearing", inputField("hearing", "e.g. Normal", "text", false))}
        {fieldGroup(
          "Clearance",
          selectField("clearanceStatus", ["CLEARED", "FOLLOW_UP", "RESTRICTED"], false),
        )}
        {fieldGroup("Follow-up Date", inputField("followUpDate", "", "date", false))}
        <div className="md:col-span-2">
          {fieldGroup(
            "Notes",
            textareaField("notes", "Optional medical follow-up notes", 3, false),
          )}
        </div>
      </div>
    );
  }
}
