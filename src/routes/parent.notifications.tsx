import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  MessageSquare,
  Plus,
  X,
  Volume2,
  AlertTriangle,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/module-shell";
import { fetchAnnouncements } from "@/lib/parent-api";

export const Route = createFileRoute("/parent/notifications")({
  head: () => ({ meta: [{ title: "Alerts & Support · Campus OS" }] }),
  component: ParentNotifications,
});

interface Ticket {
  id: string;
  title: string;
  category: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
}

function ParentNotifications() {
  const [activeChildName, setActiveChildName] = useState<string>("Student");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync active child name
  useEffect(() => {
    const handleSync = () => {
      const name = localStorage.getItem("parent_active_child_name") || "Student";
      setActiveChildName(name);
    };
    handleSync();
    window.addEventListener("activeChildChanged", handleSync);
    return () => window.removeEventListener("activeChildChanged", handleSync);
  }, []);

  // Load announcements from API
  useEffect(() => {
    setIsLoading(true);
    fetchAnnouncements()
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newTicket: Ticket = {
      id: "TCK-" + Math.floor(100 + Math.random() * 900),
      title: fd.get("title") as string,
      category: fd.get("category") as string,
      description: fd.get("description") as string,
      status: "open",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTickets([newTicket, ...tickets]);
    setShowTicketModal(false);
    toast.success("Helpdesk support ticket submitted!", { description: "Admin officers have been alerted." });
  };

  // Build alerts feed from live announcements only; show empty state if none
  const alertsFeed = announcements.slice(0, 5).map((a: any) => ({
    id: a._id || a.id,
    title: a.title,
    body: a.content || a.body || a.message,
    time: a.date || a.createdAt ? new Date(a.date || a.createdAt).toLocaleDateString() : "—",
    type: (a.priority === "high" || a.type === "warning") ? "warning" : "info",
  }));

  return (
    <div>
      <PageHeader
        title="Alerts, Notices & Helpdesk Support"
        subtitle={`School broadcasts and support ticket management for ${activeChildName}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Broadcast Notices" value={String(announcements.length)} icon={Volume2} tone="info" />
        <StatCard label="Critical Alerts" value={String(alertsFeed.filter(a => a.type === "warning").length)} icon={AlertTriangle} tone="warning" />
        <StatCard label="Support Tickets" value={String(tickets.length)} icon={LifeBuoy} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Alerts Feed */}
          <Panel title="School Announcements & Alerts">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading announcements...
              </div>
            ) : alertsFeed.length === 0 ? (
              <EmptyState icon={Bell} title="No Announcements" description="School broadcasts will appear here when published by administrators." />
            ) : (
              <div className="space-y-3">
                {alertsFeed.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 flex gap-3.5 items-start ${
                      alert.type === "warning"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <Bell className={`h-5 w-5 shrink-0 ${alert.type === "warning" ? "text-destructive" : "text-amber-500"}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{alert.title}</span>
                        <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{alert.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Notice Board */}
          <Panel title="Pinned Notice Board">
            {isLoading ? null : announcements.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No Pinned Notices" description="Notices published by the school principal will appear here." />
            ) : (
              <div className="space-y-4">
                {announcements.map((notice: any, i: number) => (
                  <div key={notice._id || i} className="rounded-xl border border-border p-4 bg-card/70 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-foreground">{notice.title}</h3>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {notice.date || notice.createdAt ? new Date(notice.date || notice.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notice.content || notice.body || notice.message}</p>
                    {(notice.author || notice.publishedBy) && (
                      <div className="text-[10px] font-bold text-accent uppercase tracking-wider">
                        Published by: {notice.author || notice.publishedBy}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Support Helpdesk */}
        <div>
          <Panel
            title="Helpdesk Support Tickets"
            action={
              <button onClick={() => setShowTicketModal(true)} className="flex items-center gap-1 text-xs text-accent hover:underline font-semibold">
                <Plus className="h-4 w-4" /> Submit Ticket
              </button>
            }
          >
            <div className="space-y-3.5">
              {tickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card/80 p-3.5 space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground bg-muted border px-2 py-0.5 rounded">{t.id}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.status === "resolved" ? "bg-green-100 text-green-700" : t.status === "in-progress" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>{t.status}</span>
                  </div>
                  <div className="text-xs font-bold text-foreground leading-snug">{t.title}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">{t.category}</div>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">"{t.description}"</p>
                  <div className="text-[9px] text-muted-foreground border-t border-border pt-1.5 mt-1">Submitted on: {t.createdAt}</div>
                </div>
              ))}
              {tickets.length === 0 && (
                <EmptyState icon={LifeBuoy} title="No Active Tickets" description="Log technical, billing or transport queries directly to our admin desk." />
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Submit Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTicketModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-foreground">Log Support Ticket</h2>
              <button onClick={() => setShowTicketModal(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Issue Department</label>
                <select name="category" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none">
                  <option value="Billing & Finance">Billing & Finance</option>
                  <option value="Transport Operations">Transport Operations</option>
                  <option value="Library Circulation">Library Circulation</option>
                  <option value="Hostel Utilities">Hostel & Mess Utilities</option>
                  <option value="LMS Software Issues">LMS Technical Support</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Brief Summary</label>
                <input name="title" required placeholder="e.g. Sibling discount not applied" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Detailed Description</label>
                <textarea name="description" required rows={4} placeholder="Describe your issue in detail..." className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow active:scale-95 transition-all text-xs">
                File Helpdesk Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
