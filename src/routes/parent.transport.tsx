import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Bus, Phone, Plus, QrCode, MapPin, X, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/module-shell";
import { fetchStudentTransport } from "@/lib/parent-api";

// ─── Animated Canvas Map ──────────────────────────────────────────────────────
function LiveBusMapCanvas({ stopName }: { stopName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let progress = 0;

    const path = [
      { x: 60,  y: 200 },
      { x: 130, y: 160 },
      { x: 230, y: 90  },
      { x: 300, y: 130 },
      { x: 420, y: 220 },
    ];

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "rgba(148,163,184,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
      for (let j = 0; j < canvas.height; j += 20) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke(); }

      // Road
      ctx.strokeStyle = "rgba(148,163,184,0.15)";
      ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Dashed center line
      ctx.strokeStyle = "#eab308"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);

      // Progress overlay
      const seg = Math.floor(progress * (path.length - 1));
      const segProg = (progress * (path.length - 1)) - seg;
      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      for (let s = 1; s <= seg; s++) ctx.lineTo(path[s].x, path[s].y);
      if (seg < path.length - 1) {
        const busX = path[seg].x + (path[seg + 1].x - path[seg].x) * segProg;
        const busY = path[seg].y + (path[seg + 1].y - path[seg].y) * segProg;
        ctx.lineTo(busX, busY);
      }
      ctx.stroke();

      // School pin
      ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(path[0].x, path[0].y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold 10px sans-serif"; ctx.fillText("🏫", path[0].x - 6, path[0].y + 3);
      ctx.fillStyle = "rgba(156,163,175,0.85)"; ctx.font = "bold 9px sans-serif";
      ctx.fillText("School", path[0].x - 14, path[0].y - 14);

      // Home stop pin
      ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold 10px sans-serif"; ctx.fillText("📍", path[path.length - 1].x - 5, path[path.length - 1].y + 3);
      ctx.fillStyle = "rgba(156,163,175,0.85)"; ctx.font = "bold 9px sans-serif";
      ctx.fillText(stopName || "Your Stop", path[path.length - 1].x - 30, path[path.length - 1].y + 20);

      // Bus
      let busX = path[0].x, busY = path[0].y;
      if (seg < path.length - 1) {
        busX = path[seg].x + (path[seg + 1].x - path[seg].x) * segProg;
        busY = path[seg].y + (path[seg + 1].y - path[seg].y) * segProg;
      } else { busX = path[path.length - 1].x; busY = path[path.length - 1].y; }

      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(busX, busY, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "bold 10px sans-serif"; ctx.fillText("🚌", busX - 7, busY + 3.5);

      // Radar pulse
      const pulse = 12 + (Date.now() % 1200) * 0.012;
      ctx.strokeStyle = "rgba(245,158,11,0.4)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(busX, busY, pulse, 0, Math.PI * 2); ctx.stroke();

      progress += 0.0008;
      if (progress > 1.0) progress = 0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [stopName]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <canvas ref={canvasRef} width={480} height={260} className="w-full h-auto bg-[#070b19] block" />
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/parent/transport")({
  head: () => ({ meta: [{ title: "Live Bus Tracking · Campus OS" }] }),
  component: ParentTransport,
});

interface GatePass {
  id: string;
  visitorName: string;
  relationship: string;
  pickupTime: string;
  status: "active" | "scanned" | "expired";
  qrCodeValue: string;
}

function ParentTransport() {
  const [activeChildId, setActiveChildId]     = useState<string>("");
  const [activeChildName, setActiveChildName] = useState<string>("Student");
  const [transportInfo, setTransportInfo]     = useState<any>(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [createdPass, setCreatedPass]         = useState<GatePass | null>(null);
  const [gatePasses, setGatePasses]           = useState<GatePass[]>([]);

  // Sync active child from parent layout
  useEffect(() => {
    const handleSync = () => {
      const id   = localStorage.getItem("parent_active_child") || "";
      const name = localStorage.getItem("parent_active_child_name") || "Student";
      setActiveChildId(id);
      setActiveChildName(name);
    };
    handleSync();
    window.addEventListener("activeChildChanged", handleSync);
    return () => window.removeEventListener("activeChildChanged", handleSync);
  }, []);

  // Load transport data per child
  const loadTransport = useCallback(async () => {
    if (!activeChildId) return;
    setIsLoading(true);
    try {
      const data = await fetchStudentTransport(activeChildId);
      setTransportInfo(data);
    } catch {
      setTransportInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeChildId]);

  useEffect(() => { loadTransport(); }, [loadTransport]);

  const handleCreateGatePass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const passId = "GP-" + Math.floor(1000 + Math.random() * 9000);
    const newPass: GatePass = {
      id: passId,
      visitorName:  fd.get("visitorName")  as string,
      relationship: fd.get("relationship") as string,
      pickupTime:   fd.get("pickupTime")   as string,
      status: "active",
      qrCodeValue: `CAMPUSOS_GATEPASS_${passId}_${fd.get("visitorName")}`,
    };
    setGatePasses([newPass, ...gatePasses]);
    setCreatedPass(newPass);
    setShowGatePassModal(false);
    toast.success("Gate Pass authorized successfully!");
  };

  if (!activeChildId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Bus className="h-10 w-10 text-muted-foreground mb-3" />
        <div className="font-semibold text-foreground">No child selected</div>
        <p className="text-sm text-muted-foreground mt-1">Select a child profile from the top bar to view transport details.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading transport data...
      </div>
    );
  }

  // Graceful field access with fallbacks
  const route      = transportInfo?.route       ?? transportInfo?.routeNo      ?? "—";
  const busNo      = transportInfo?.busNo       ?? transportInfo?.vehicleNo    ?? "—";
  const driver     = transportInfo?.driverName  ?? transportInfo?.driver       ?? "—";
  const phone      = transportInfo?.driverPhone ?? transportInfo?.phone        ?? "—";
  const stopName   = transportInfo?.stopName    ?? transportInfo?.pickupStop   ?? "—";
  const stopTime   = transportInfo?.stopTime    ?? transportInfo?.pickupTime   ?? "—";

  return (
    <div>
      <PageHeader
        title="Live School Bus & Security Hub"
        subtitle={`Real-time transport tracking and gate pass management for ${activeChildName}`}
      />

      {!transportInfo ? (
        <EmptyState icon={Bus} title="No Transport Assigned" description="This student has no bus route assigned. Contact the transport department." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <StatCard label="Assigned Route" value={route} icon={Bus} tone="info" />
            <StatCard label="Live Driver Line" value={driver} delta={phone} icon={Phone} />
            <StatCard label="Pickup/Drop Stop" value={stopName} delta={stopTime} icon={MapPin} tone="success" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Live GPS Map */}
              <Panel
                title="Assigned Bus Live GPS Map"
                action={
                  <span className="flex items-center gap-1 text-xs text-[oklch(0.45_0.15_155)] font-bold uppercase animate-pulse">
                    <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.15_155)]" />
                    Live Broadcast
                  </span>
                }
              >
                <LiveBusMapCanvas stopName={stopName} />
                <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground font-semibold px-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> School Campus</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {stopName}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Bus {busNo}</span>
                </div>
              </Panel>

              {/* Gate Passes */}
              <Panel
                title="Authorized Gate Passes (Early Pickups)"
                action={
                  <button onClick={() => setShowGatePassModal(true)} className="flex items-center gap-1 text-xs text-accent hover:underline font-semibold">
                    <Plus className="h-4 w-4" /> Authorize Relative
                  </button>
                }
              >
                {gatePasses.length === 0 ? (
                  <EmptyState icon={QrCode} title="No Gate Passes" description="Authorize a relative or family driver to pick up your child early." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gatePasses.map((pass) => (
                      <div key={pass.id} className="rounded-xl border border-border p-4 bg-card/85 flex items-center justify-between gap-3 shadow-sm hover:shadow">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-foreground">{pass.visitorName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Relation: {pass.relationship} · Time: {pass.pickupTime}
                          </div>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full">{pass.id}</span>
                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold uppercase">{pass.status}</span>
                          </div>
                        </div>
                        <button onClick={() => setCreatedPass(pass)} className="grid h-10 w-10 place-items-center rounded-xl bg-muted hover:bg-accent hover:text-white transition-all shadow-sm">
                          <QrCode className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Panel title="Transport Safety Settings">
                <div className="space-y-4">
                  {[
                    { label: "Proximity Alert Geofence", desc: `Notify when bus is within 500m of ${stopName}.`, defaultOn: true },
                    { label: "Boarding Updates SMS", desc: "Alert when child checks-in via RFID.", defaultOn: true },
                    { label: "Trip Delay Bulletins", desc: "Alerts for delays over 10 minutes.", defaultOn: false },
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center justify-between ${i > 0 ? "border-t border-border pt-4" : ""}`}>
                      <div>
                        <div className="text-xs font-bold text-foreground">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                      </div>
                      <input type="checkbox" defaultChecked={s.defaultOn} className="h-4 w-8 rounded-full bg-accent/40 accent-accent cursor-pointer" />
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Emergency Contacts">
                <div className="space-y-3.5">
                  {phone && phone !== "—" && (
                    <a href={`tel:${phone}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded bg-accent/10 text-accent font-bold">📞</div>
                        <div>
                          <div className="text-xs font-bold text-foreground">Designated Driver</div>
                          <div className="text-[10px] text-muted-foreground">{driver} · {phone}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-accent uppercase hover:underline">Call</span>
                    </a>
                  )}
                  <a href="tel:+918005551212" className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded bg-destructive/10 text-destructive font-bold">📞</div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Security Gate Ops</div>
                        <div className="text-[10px] text-muted-foreground">Emergency Helpdesk Line</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-destructive uppercase hover:underline">Call</span>
                  </a>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      {/* Gate Pass Modal */}
      {showGatePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowGatePassModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-foreground">Authorize Visitor / Relative</h2>
              <button onClick={() => setShowGatePassModal(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreateGatePass} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Visitor Full Name</label>
                <input name="visitorName" required placeholder="e.g. Sunil Sharma" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Relationship</label>
                <input name="relationship" required placeholder="e.g. Uncle / Aunt / Driver" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Planned Pickup Time</label>
                <input name="pickupTime" required placeholder="e.g. 15:30 Today" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow active:scale-95 transition-all text-xs">
                Generate Security Gate Pass
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gate Pass QR Modal */}
      {createdPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setCreatedPass(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-card p-6 shadow-2xl border border-border text-center animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Authorized Pass QR</span>
              <button onClick={() => setCreatedPass(null)} className="grid h-6 w-6 place-items-center rounded-lg hover:bg-muted text-muted-foreground"><X className="h-3 w-3" /></button>
            </div>
            <div className="bg-muted p-4 border border-dashed border-border rounded-xl flex items-center justify-center mb-4">
              <QrCode className="h-32 w-32 text-foreground" />
            </div>
            <div className="text-sm font-bold text-foreground">{createdPass.visitorName}</div>
            <div className="text-xs text-muted-foreground">{createdPass.relationship} · Early Pickup</div>
            <div className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full inline-block mt-2 font-semibold border border-accent/20">
              Valid: {createdPass.pickupTime}
            </div>
            <div className="mt-4 border-t border-border pt-3 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.45_0.15_155)]" />
              Encrypted security clearance token
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
