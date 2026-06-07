import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Edit, Save } from "lucide-react";
import { PageHeader, Panel } from "@/components/module-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/student/profile")({ component: Page });

function Page() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    parentPhone: user?.parentPhone || "",
    bloodGroup: user?.bloodGroup || "",
  });
  const [badges, setBadges] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        parentPhone: user.parentPhone || "",
        bloodGroup: user.bloodGroup || "",
      });
    }
  }, [user]);

  // Fetch badges and election candidates from backend
  useEffect(() => {
    // Badges
    fetch('/api/v1/badges')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
        setBadges(list);
      })
      .catch((e) => console.error('Failed to load badges', e));
    const fetchCandidates = () => {
      fetch('/api/v1/election-candidates')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
          setCandidates(list);
        })
        .catch((e) => console.error('Failed to load candidates', e));
    };
    fetchCandidates();
  }, []);

  const handleVote = async (candidateId: string, name: string, hasVoted: boolean) => {
    try {
      const res = await fetch('/api/v1/election-candidates/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      });
      if (res.ok) {
        if (hasVoted) {
           toast.success("Vote Removed", { description: "You have retracted your vote." });
        } else {
           toast.success("Ballot Cast Successfully!", { description: `You voted for ${name}.` });
        }
        // Refetch candidates to update UI
        fetch('/api/v1/election-candidates')
          .then((res) => res.json())
          .then((data) => {
             const list = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
             setCandidates(list);
          });
      } else {
        toast.error("Failed to vote", { description: "Please try again later." });
      }
    } catch (e) {
      toast.error("Network Error", { description: "Could not cast vote." });
    }
  };

  const handleSave = () => {
    updateProfile({ 
      name: form.name, 
      phone: form.phone, 
      address: form.address,
      parentPhone: form.parentPhone,
      bloodGroup: form.bloodGroup,
    });
    toast.success("Profile updated", { description: "Your changes have been saved." });
    setEditing(false);
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="View and edit your personal information"
        actions={
          editing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted active:scale-95 transition-all"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col items-center">
          <div className="grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br from-[#1a2e5a] to-accent text-4xl font-bold text-white shadow-lg">
            {user?.initials}
          </div>
          <div className="mt-4 text-lg font-semibold text-center">{user?.name}</div>
          <div className="text-sm text-muted-foreground">{user?.sub}</div>
          <div className="mt-4 w-full">
            <Panel title="Quick Stats">
              <div className="space-y-2 text-sm">
                {[
                  ["Role", user?.role || "Student"],
                  ["Student Code", user?.studentCode || "—"],
                  ["School Code", user?.schoolCode || "—"],
                  ["Email", user?.email || "—"],
                  ["System ID", user?.id?.slice(-6) || "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
        <div className="lg:col-span-2">
          <Panel title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Full Name", "name", form.name],
                ["Email", "email", user?.email || "", true],
                ["Student Code", "studentCode", user?.studentCode || "", true],
                ["Phone", "phone", form.phone],
                ["School Code", "schoolCode", user?.schoolCode || "", true],
                ["Class", "class", user?.className ? `${user.className} - ${user.sectionName || ''}` : "", true],
                ["Parent Phone", "parentPhone", form.parentPhone],
                ["Date of Birth", "dob", user?.dob || "", true],
                ["Gender", "gender", user?.gender || "", true],
                ["Blood Group", "bloodGroup", form.bloodGroup],
                ["Role", "role", user?.role || "", true],
                ["Address", "address", form.address],
              ].map(([label, key, value, disabled]) => (
                <div key={key as string}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label as string}
                  </label>
                  {editing && !disabled ? (
                    <input
                      value={value as string}
                      onChange={(e) => setForm((p) => ({ ...p, [key as string]: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  ) : (
                    <div className="h-10 flex items-center rounded-lg bg-muted px-3 text-sm">
                      {value as string}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* MERIT BADGES */}
            <Panel title="My Earned Merit Trophies & Badges">
              <div className="grid grid-cols-3 gap-3">
                {badges.map((badge: any) => (
                  <div
                    key={badge.name}
                    className="group relative flex flex-col items-center justify-center p-3 rounded-2xl border bg-card/50 text-center hover:shadow-lg transition-all hover:-translate-y-1"
                  >
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-md transition-transform group-hover:scale-115 ${badge.tone}`}
                    >
                      {badge.icon}
                    </div>
                    <h4 className="font-bold text-[10px] text-foreground mt-2 truncate max-w-full leading-none">
                      {badge.name}
                    </h4>
                    <span className="pointer-events-none absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 transition-opacity group-hover:opacity-100 max-w-[150px] shadow-xl text-center leading-normal border border-slate-800 z-10">
                      {badge.desc}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* STUDENT COUNCIL ELECTION BALLOT */}
            <Panel title="Student Council Election Ballot">
              <div className="space-y-3.5 text-xs">
                <div className="flex gap-2.5 items-start rounded-xl border border-border bg-muted/20 p-3">
                  <span className="text-base shrink-0">🗳️</span>
                  <div>
                    <h4 className="font-bold text-foreground leading-none">
                      Council Election Active
                    </h4>
                    <p className="text-[9px] text-muted-foreground mt-1 leading-normal">
                      Cast your official ballot choice for School President below. Voting is
                      authenticated via secure hash.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {candidates.map((cand: any) => {
                    const isHead = cand.votes > 0 && cand.votes === Math.max(...candidates.map((c: any) => c.votes));
                    return (
                      <div
                        key={cand.id}
                        className="p-3 border rounded-xl bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-3 relative overflow-hidden"
                      >
                        {isHead && (
                          <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                            Current Head 👑
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-500/10 text-lg shadow-sm">
                            {cand.avatar}
                          </div>
                          <div>
                            <strong className="text-foreground font-bold flex items-center gap-2">
                              {cand.name} 
                              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-mono">
                                {cand.votes} Votes
                              </span>
                            </strong>
                            <span className="text-[9px] text-muted-foreground block mt-0.5">
                              {cand.grade}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleVote(cand.id, cand.name, cand.hasVoted)}
                          className={`${
                            cand.hasVoted 
                              ? "bg-red-500 hover:bg-red-600" 
                              : "bg-indigo-600 hover:bg-indigo-700"
                          } text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg active:scale-95 cursor-pointer shadow-sm uppercase tracking-wider transition-colors`}
                        >
                          {cand.hasVoted ? "Remove Vote" : "Vote"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>

          {/* STUDENT PORTFOLIO GALLERY */}
          <div className="mt-6">
            <Panel title="My Digital Student Portfolio (Project & Certificates Archive)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    title: "Gemini AI Helper App",
                    category: "Computer Science",
                    date: "May 2026",
                    icon: "🤖",
                  },
                  {
                    title: "Tribology & Friction Lab Report",
                    category: "Physics Lab",
                    date: "April 2026",
                    icon: "🔬",
                  },
                  {
                    title: "Debate Winner Certificate",
                    category: "Co-Curricular",
                    date: "March 2026",
                    icon: "📜",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-xl border bg-card/60 flex items-start gap-3 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all"
                  >
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-lg bg-indigo-500/10 text-xl border">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        {item.category}
                      </p>
                      <span className="text-[9px] font-mono text-muted-foreground block mt-1">
                        {item.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
