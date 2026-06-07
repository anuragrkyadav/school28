import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Check, X as XIcon, Clock, Users, Loader2, Camera, QrCode, Volume2, Play } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/module-shell";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/teacher/attendance")({ component: Page });

const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch checkout sound
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    console.error("Web Audio Beep failed", err);
  }
};

function Page() {
  const [selectedClass, setSelectedClass] = useState("10-A");
  const [grade, section] = selectedClass.split("-");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<"manual" | "qr">("manual");
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // In a real app we'd filter by class in the API, fetching all for now
        const res: any = await apiClient("/students?limit=100");
        setStudents(res?.data || []);
      } catch (err) {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const classStudents = students.filter(
    (s) => (s.classDetails?.name || "").includes(grade) && (s.sectionDetails?.name || "") === section
  );

  const [records, setRecords] = useState<Record<string, "present" | "absent" | "late" | "leave">>({});

  // Load existing attendance for today and ensure all students have a status (default to "present")
  useEffect(() => {
    const loadExisting = async () => {
      const today = new Date().toISOString().split("T")[0];
      const updates: Record<string, "present" | "absent" | "late" | "leave"> = {};
      await Promise.all(
        classStudents.map(async (s) => {
          try {
            const res: any = await apiClient(`/attendance/student/${s._id}`);
            const history = res?.data || [];
            const todayRec = history.find((r: any) => r.session_date === today);
            if (todayRec) {
              updates[s._id] = todayRec.status as any;
            } else {
              updates[s._id] = "present";
            }
          } catch (e) {
            // If request fails, default to present
            updates[s._id] = "present";
          }
        })
      );
      setRecords(updates);
    };
    loadExisting();
  }, [selectedClass, students]);



  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = classStudents.map((s) => ({
        session_date: new Date().toISOString().split("T")[0],
        grade,
        section,
        student_id: s._id,
        student_name: `${s.user?.firstName} ${s.user?.lastName}`,
        status: records[s._id] || "present",
      }));
      await apiClient("/attendance/bulk", { method: "POST", data: payload });
      toast.success("Attendance saved!", { description: `${selectedClass} attendance recorded.` });
    } catch (err) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const present = Object.values(records).filter((v) => v === "present").length;
  const absent = Object.values(records).filter((v) => v === "absent").length;

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily class attendance" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Present" value={String(present)} icon={Check} tone="success" />
        <StatCard label="Absent" value={String(absent)} icon={XIcon} tone="warning" />
        <StatCard
          label="Late"
          value={String(Object.values(records).filter((v) => v === "late").length)}
          icon={Clock}
        />
        <StatCard label="Total" value={String(classStudents.length)} icon={Users} tone="info" />
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {["10-A", "10-B", "10-C", "9-A", "9-B"].map((cls) => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectedClass === cls ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}
          >
            {cls}
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-2 border-b border-border pb-3">
        <button
          onClick={() => setAttendanceMode("manual")}
          className={`flex items-center gap-2 pb-2 px-4 text-sm font-semibold transition-all border-b-2 ${
            attendanceMode === "manual" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Manual Roll Call
        </button>
        <button
          onClick={() => setAttendanceMode("qr")}
          className={`flex items-center gap-2 pb-2 px-4 text-sm font-semibold transition-all border-b-2 ${
            attendanceMode === "qr" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="h-4 w-4" />
          QR & ID Card Scan Kiosk
        </button>
      </div>

      {attendanceMode === "manual" ? (
        <Panel
          title={`Roll Call — ${selectedClass}`}
          action={
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <ClipboardCheck className="h-4 w-4" />
              Save
            </button>
          }
        >
          <div className="space-y-2">
            {classStudents.map((s) => {
              const fullName = `${s.user?.firstName} ${s.user?.lastName}`;
              return (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-semibold">
                      {fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{fullName}</div>
                      <div className="text-xs text-muted-foreground">Roll #{s.rollNumber || s.admissionNumber}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(["present", "absent", "late", "leave"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setRecords((p) => ({ ...p, [s._id]: status }))}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${records[s._id] === status ? (status === "present" ? "bg-[oklch(0.65_0.15_155)] text-white" : status === "absent" ? "bg-destructive text-white" : status === "late" ? "bg-[oklch(0.75_0.15_75)] text-white" : "bg-accent text-white") : "border border-border hover:bg-muted"}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {classStudents.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No students found in {selectedClass}.
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Simulated Scanner View */}
          <div className="lg:col-span-2">
            <Panel
              title="ID Scan Camera Broadcast"
              action={
                <span className="flex items-center gap-1.5 text-xs text-[oklch(0.45_0.15_155)] font-bold uppercase animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.15_155)]" />
                  Kiosk Ready
                </span>
              }
            >
              <div className="relative h-80 rounded-2xl bg-black border border-border overflow-hidden flex flex-col items-center justify-center">
                {/* Visual scanner radar line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_10px_#10b981] animate-bounce" style={{ animationDuration: "3s" }} />

                {/* Simulated static scan target brackets */}
                <div className="absolute h-48 w-48 border-2 border-emerald-500/40 rounded-3xl flex flex-col justify-between p-4">
                  <div className="flex justify-between">
                    <span className="h-4 w-4 border-t-2 border-l-2 border-emerald-500" />
                    <span className="h-4 w-4 border-t-2 border-r-2 border-emerald-500" />
                  </div>
                  <div className="flex justify-between">
                    <span className="h-4 w-4 border-b-2 border-l-2 border-emerald-500" />
                    <span className="h-4 w-4 border-b-2 border-r-2 border-emerald-500" />
                  </div>
                </div>

                {/* Text prompt */}
                <div className="z-10 text-center space-y-2 px-4">
                  <Camera className="h-10 w-10 text-emerald-500 mx-auto animate-pulse" />
                  <p className="text-sm font-medium text-white">Position Student RFID Badge or QR Code inside boundaries</p>
                  <p className="text-[10px] text-zinc-400">Audio feedback will sound immediately upon identification</p>
                </div>
              </div>

              {/* Simulation inputs for testing scan swipes */}
              <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Simulate Barcode Sweep (Test Tool)</label>
                <div className="flex gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const stud = classStudents.find((s) => s._id === id);
                      if (stud) {
                        playBeep();
                        setRecords((p) => ({ ...p, [id]: "present" }));
                        const name = `${stud.user?.firstName} ${stud.user?.lastName}`;
                        setRecentScans((prev) => [{ id, name, time: new Date().toLocaleTimeString(), rollNo: stud.rollNumber || stud.admissionNumber }, ...prev].slice(0, 10));
                        toast.success(`Check-In: ${name} marked Present!`);
                      }
                      e.target.value = "";
                    }}
                    className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none"
                  >
                    <option value="">-- Choose student to simulate scan swipe --</option>
                    {classStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.user?.firstName} {s.user?.lastName} (Roll #{s.rollNumber || s.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>
          </div>

          {/* Recent Scans Feed */}
          <div>
            <Panel title="Recent Checked-In Logs">
              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                {recentScans.map((scan, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card/65 shadow-sm animate-in slide-in-from-top duration-300">
                    <div>
                      <div className="text-xs font-bold text-foreground">{scan.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Roll #{scan.rollNo} · Verified Boarding</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-emerald-500/10 text-[oklch(0.45_0.15_155)] border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                        PRESENT
                      </span>
                      <div className="text-[9px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {scan.time}
                      </div>
                    </div>
                  </div>
                ))}
                {recentScans.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground text-xs leading-normal">
                    <Volume2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50 animate-bounce" />
                    No RFID check-ins logged yet.<br />Use simulated sweep selector to log check-ins.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
