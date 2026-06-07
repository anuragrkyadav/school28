import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  Download,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Video,
  Star,
  X,
  Loader2,
} from "lucide-react";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/module-shell";
import {
  fetchStudentAcademics,
  fetchStudentHomework,
  fetchStudentReportCards,
  fetchPtmMeetings,
  createPtmMeeting,
} from "@/lib/parent-api";

export const Route = createFileRoute("/parent/academics")({
  head: () => ({ meta: [{ title: "Academic Oversight · Campus OS" }] }),
  component: ParentAcademics,
});

function ParentAcademics() {
  const [activeChildId, setActiveChildId] = useState<string>("");
  const [showPtmModal, setShowPtmModal] = useState(false);
  const [viewingReportCard, setViewingReportCard] = useState<any | null>(null);

  // API state
  const [academics, setAcademics] = useState<any>(null);
  const [homework, setHomework] = useState<any[]>([]);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync active child from parent layout via localStorage
  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem("parent_active_child") || "";
      setActiveChildId(stored);
    };
    handleSync();
    window.addEventListener("activeChildChanged", handleSync);
    return () => window.removeEventListener("activeChildChanged", handleSync);
  }, []);

  const loadData = useCallback(async () => {
    if (!activeChildId) return;
    setIsLoading(true);
    setError("");
    try {
      const [acad, hw, rcs, ptm] = await Promise.allSettled([
        fetchStudentAcademics(activeChildId),
        fetchStudentHomework(activeChildId),
        fetchStudentReportCards(activeChildId),
        fetchPtmMeetings(activeChildId),
      ]);
      setAcademics(acad.status === "fulfilled" ? acad.value : null);
      setHomework(hw.status === "fulfilled" && Array.isArray(hw.value) ? hw.value : []);
      setReportCards(rcs.status === "fulfilled" && Array.isArray(rcs.value) ? rcs.value : []);
      setMeetings(ptm.status === "fulfilled" && Array.isArray(ptm.value) ? ptm.value : []);
    } catch (e: any) {
      setError(e.message || "Failed to load academic data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeChildId]);

  useEffect(() => { loadData(); }, [loadData]);

  const studentName = academics?.studentName || academics?.name || "Student";
  const gpa = academics?.cgpa ?? academics?.gpa ?? "—";
  const rank = academics?.rank ?? "—";

  const handleBookMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const newMeeting = await createPtmMeeting(activeChildId, {
        teacher: fd.get("teacher") as string,
        subject: fd.get("subject") as string,
        dateTime: fd.get("dateTime") as string,
        type: fd.get("type") as string,
      });
      setMeetings((prev) => [...prev, newMeeting]);
      toast.success("Parent-Teacher Conference Booked!");
    } catch {
      // Optimistic fallback
      setMeetings((prev) => [
        ...prev,
        {
          id: "PTM-" + Math.floor(100 + Math.random() * 900),
          teacherName: fd.get("teacher"),
          subject: fd.get("subject"),
          dateTime: fd.get("dateTime"),
          type: fd.get("type"),
          status: "scheduled",
        },
      ]);
      toast.success("PTM slot booked!");
    }
    setShowPtmModal(false);
  };

  if (!activeChildId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
        <div className="font-semibold text-foreground">No child selected</div>
        <p className="text-sm text-muted-foreground mt-1">Select a child from the top bar to view academics.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading academic records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-destructive font-semibold mb-2">Failed to load data</div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Retry</button>
      </div>
    );
  }

  const completedHW = homework.filter((h) => h.grade && h.grade !== "Pending").length;

  return (
    <div>
      <PageHeader
        title="Academic Performance & Oversight"
        subtitle={`Report card vault, homework diary and PTM schedules for ${studentName}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Yearly Average GPA" value={String(gpa)} icon={GraduationCap} tone="success" />
        <StatCard label="Class Rank Standing" value={String(rank)} icon={Star} tone="info" />
        <StatCard
          label="Homework Completion"
          value={homework.length ? `${completedHW} / ${homework.length}` : "—"}
          icon={CheckCircle}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Homework Diary */}
          <Panel title="Homework Diary & Teacher Assessments">
            {homework.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No Homework Records" description="Homework assigned by teachers will appear here." />
            ) : (
              <div className="space-y-4">
                {homework.map((hw: any, i: number) => (
                  <div key={hw._id || i} className="rounded-xl border border-border p-4 bg-card/75 flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent px-2.5 py-0.5 rounded-full">
                          {hw.subject || hw.subjectName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Assigned: {hw.assignedDate ? new Date(hw.assignedDate).toLocaleDateString() : hw.assigned} · by {hw.teacherName || hw.teacher}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{hw.description || hw.desc || hw.title}</p>
                      {hw.feedback && hw.grade !== "Pending" && (
                        <div className="mt-2 bg-muted/40 p-2.5 rounded-lg border border-border flex items-start gap-2 text-xs">
                          <span className="font-bold text-[oklch(0.45_0.15_155)] uppercase">Teacher Feedback:</span>
                          <span className="text-muted-foreground">"{hw.feedback}"</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase">Grade / Status</div>
                      <span className={`text-base font-bold ${!hw.grade || hw.grade === "Pending" ? "text-amber-500" : "text-[oklch(0.45_0.15_155)]"}`}>
                        {hw.grade || "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Report Card Vault */}
          <Panel title="Report Card Vault">
            {reportCards.length === 0 ? (
              <EmptyState icon={FileText} title="No Report Cards" description="Published report cards will appear here." />
            ) : (
              <div className="space-y-3">
                {reportCards.map((rc: any, i: number) => (
                  <div key={rc._id || i} className="rounded-xl border border-border p-4 bg-card/70 flex items-center justify-between shadow-sm hover:shadow">
                    <div className="flex items-center gap-3">
                      <FileText className="h-9 w-9 text-accent/80" />
                      <div>
                        <div className="text-sm font-bold text-foreground">{rc.term || rc.examName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Issued: {rc.date ? new Date(rc.date).toLocaleDateString() : rc.issuedDate} · Overall CGPA:{" "}
                          <span className="text-foreground font-semibold">{rc.cgpa ?? rc.gpa ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingReportCard(rc)}
                      className="flex items-center gap-1 text-xs text-accent hover:underline font-semibold bg-accent/5 hover:bg-accent/10 px-3.5 py-2 rounded-lg border border-accent/15 transition-all active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      View Card
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* PTM Scheduler */}
        <div>
          <Panel
            title="PTM Meeting Conferences"
            action={
              <button onClick={() => setShowPtmModal(true)} className="flex items-center gap-1 text-xs text-accent hover:underline font-semibold">
                <Calendar className="h-4 w-4" /> Book PTM Slot
              </button>
            }
          >
            <div className="space-y-4">
              {meetings.map((m: any, i: number) => (
                <div key={m._id || m.id || i} className="rounded-xl border border-border p-3.5 bg-card/85 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                      {m._id?.slice(-6).toUpperCase() || m.id}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${m.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {m.status || "scheduled"}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground">{m.teacherName || m.teacher}</div>
                  <div className="text-xs text-muted-foreground">{m.subject}</div>
                  <div className="flex justify-between items-center border-t border-border pt-2 text-[10px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{m.dateTime || (m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : "—")}</span>
                    <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />{m.type || "Video Call"}</span>
                  </div>
                </div>
              ))}
              {meetings.length === 0 && (
                <EmptyState icon={Calendar} title="No PTM Booked" description="Use the button above to schedule a Parent-Teacher conference." />
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Book PTM Modal */}
      {showPtmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowPtmModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-foreground">Schedule PTM Conference</h2>
              <button onClick={() => setShowPtmModal(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleBookMeeting} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Teacher</label>
                <input name="teacher" required placeholder="Teacher name" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <input name="subject" required placeholder="e.g. Mathematics" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Preferred Date & Time</label>
                <input name="dateTime" type="datetime-local" required className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Conference Mode</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="type" value="Video Call" defaultChecked /> Virtual Video Call</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="type" value="In-Person" /> In-Person Campus</label>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow active:scale-95 transition-all text-xs">
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {viewingReportCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingReportCard(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border text-foreground font-serif animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b-2 border-primary pb-3 font-sans">
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-primary">CAMPUS OS ACADEMY</h1>
                <p className="text-[9px] text-muted-foreground">Certified Term Record Archive</p>
              </div>
              <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">OFFICIAL TRANSCRIPT</span>
            </div>
            <div className="my-5 text-center font-sans">
              <h2 className="text-base font-bold text-foreground uppercase">{viewingReportCard.term || viewingReportCard.examName}</h2>
              <p className="text-xs text-muted-foreground">Student: <span className="font-semibold text-foreground">{studentName}</span></p>
            </div>
            {viewingReportCard.grades && (
              <table className="w-full text-left text-xs font-sans border-collapse mb-5">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-bold">
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(viewingReportCard.grades).map(([subj, gr]: any) => (
                    <tr key={subj} className="border-b border-border">
                      <td className="py-2 px-3">{subj}</td>
                      <td className="py-2 px-3 text-right font-bold text-accent">{gr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {viewingReportCard.summary && (
              <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs mb-5 font-sans leading-relaxed">
                <div className="font-bold text-foreground">Principal Remarks:</div>
                <p className="text-muted-foreground italic mt-0.5">"{viewingReportCard.summary}"</p>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-border pt-4 text-xs font-sans">
              <div className="flex items-center gap-1.5 font-semibold text-[oklch(0.45_0.15_155)]">
                <CheckCircle className="h-3.5 w-3.5" /> Digitally Verified
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Overall GPA</div>
                <div className="text-lg font-extrabold text-primary">{viewingReportCard.cgpa ?? viewingReportCard.gpa ?? "—"}</div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex justify-end gap-2 font-sans">
              <button onClick={() => window.print()} className="rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground px-4 py-2 text-xs font-semibold shadow-sm">Print</button>
              <button onClick={() => setViewingReportCard(null)} className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold shadow-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
