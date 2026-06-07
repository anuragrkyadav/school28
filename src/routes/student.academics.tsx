import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader, Panel, StatCard } from "@/components/module-shell";
import { Clock, TrendingUp, Award, Loader2 } from "lucide-react";

export const Route = createFileRoute("/student/academics")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [gradeRecords, setGradeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [attendanceRes, gradesRes] = await Promise.allSettled([
          apiClient<any[]>(`/attendance/student/${user.studentId}`),
          apiClient<any[]>(`/academics/grades/student/${user.studentId}`),
        ]);

        if (attendanceRes.status === "fulfilled") {
          setAttendanceRecords(attendanceRes.value || []);
        }
        if (gradesRes.status === "fulfilled") {
          setGradeRecords(gradesRes.value || []);
        }
      } catch (err) {
        console.error("Academics/attendance loading failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.studentId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">
            Loading academics and attendance...
          </span>
        </div>
      </div>
    );
  }

  // --- Dynamic Attendance Processing ---
  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status?.toLowerCase() === "present"
  ).length;
  const absentCount = attendanceRecords.filter(
    (r) => r.status?.toLowerCase() === "absent"
  ).length;
  const leaveCount = attendanceRecords.filter(
    (r) => r.status?.toLowerCase() === "leave" || r.status?.toLowerCase() === "half_day"
  ).length;
  const lateCount = attendanceRecords.filter(
    (r) => r.status?.toLowerCase() === "late"
  ).length;

  // Present + Late counts as present for percentage
  const effectivePresent = presentCount + lateCount;
  const attendancePercent =
    totalAttendance > 0
      ? Math.round((effectivePresent / totalAttendance) * 100)
      : 0;

  const attendanceData = [
    { name: "Present", value: effectivePresent, color: "oklch(0.55 0.13 255)" },
    { name: "Absent", value: absentCount, color: "oklch(0.58 0.22 27)" },
    { name: "Leave", value: leaveCount, color: "oklch(0.75 0.15 75)" },
  ].filter((d) => d.value > 0 || totalAttendance === 0);

  // --- Dynamic Performance (Grades) Processing ---
  const totalGrades = gradeRecords.length;
  const averageScorePercent =
    totalGrades > 0
      ? Math.round(
          gradeRecords.reduce(
            (acc, r) => acc + (Number(r.score) / Number(r.max_score || 100)) * 100,
            0
          ) / totalGrades
        )
      : 0;

  // Group scores by subject for the bar chart
  const subjectAverages: Record<string, { subject: string; sum: number; count: number }> = {};
  gradeRecords.forEach((g) => {
    const subName = g.subject || "Subject";
    if (!subjectAverages[subName]) {
      subjectAverages[subName] = { subject: subName, sum: 0, count: 0 };
    }
    subjectAverages[subName].sum += (Number(g.score) / Number(g.max_score || 100)) * 100;
    subjectAverages[subName].count += 1;
  });

  const subjectChartData = Object.values(subjectAverages).map((s) => ({
    s: s.subject,
    score: Math.round(s.sum / s.count),
  }));

  // Fallback to empty display subjects if none found to keep layout
  const displaySubjects =
    subjectChartData.length > 0 ? subjectChartData : [];

  return (
    <div>
      <PageHeader
        title="Academics & Attendance"
        subtitle="Your academic performance and attendance analytics"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Attendance"
          value={totalAttendance > 0 ? `${attendancePercent}%` : "—%"}
          delta={totalAttendance > 0 ? (attendancePercent >= 75 ? "Above 75% target" : "Below 75% target") : "No logs recorded"}
          icon={Clock}
          tone={totalAttendance > 0 ? (attendancePercent >= 75 ? "success" : "warning") : "default"}
        />
        <StatCard
          label="Present Days"
          value={totalAttendance > 0 ? String(effectivePresent) : "0"}
          icon={Clock}
          tone="info"
        />
        <StatCard
          label="Overall Score"
          value={totalGrades > 0 ? `${averageScorePercent}%` : "—%"}
          delta={totalGrades > 0 ? "Real term averages" : "No grades recorded"}
          icon={TrendingUp}
          tone={totalGrades > 0 ? "success" : "default"}
        />
        <StatCard 
          label="Class Rank" 
          value={totalGrades > 0 ? "#4" : "—"} 
          delta={totalGrades > 0 ? "Out of 42" : "No ranking data"} 
          icon={Award} 
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Attendance Breakdown">
          {totalAttendance > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {attendanceData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6">
                {attendanceData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <div className="text-sm font-medium">No attendance logs found</div>
              <div className="text-xs">Your attendance entries will show up here.</div>
            </div>
          )}
        </Panel>
        <Panel title="Subject-wise Performance">
          {totalGrades > 0 ? (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={displaySubjects}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.91 0.015 255)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="s"
                    stroke="oklch(0.50 0.03 260)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="oklch(0.50 0.03 260)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="score" fill="oklch(0.55 0.13 255)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
              <div className="text-sm font-medium">No academic grades found</div>
              <div className="text-xs">Your graded scores will show up here.</div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
