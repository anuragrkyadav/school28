import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Coffee, History, Plus, Phone, Loader2 } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/module-shell";
import { fetchChildCanteen } from "@/lib/parent-api";

export const Route = createFileRoute("/parent/canteen")({
  head: () => ({ meta: [{ title: "Canteen Wallet · Campus OS" }] }),
  component: Page,
});

function Page() {
  const [activeChildId, setActiveChildId] = useState("");
  const [activeChildName, setActiveChildName] = useState("Student");
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadAmount, setLoadAmount] = useState("");

  useEffect(() => {
    const handleSync = () => {
      setActiveChildId(localStorage.getItem("parent_active_child") || "");
      setActiveChildName(localStorage.getItem("parent_active_child_name") || "Student");
    };
    handleSync();
    window.addEventListener("activeChildChanged", handleSync);
    return () => window.removeEventListener("activeChildChanged", handleSync);
  }, []);

  useEffect(() => {
    if (!activeChildId) return;
    setLoading(true);
    fetchChildCanteen(activeChildId)
      .then((data) => setWallet(data))
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, [activeChildId]);

  const handleLoadMoney = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(loadAmount || 0);
    if (!amount) return;
    toast.success(`₹${amount} top-up requested`, { description: "Use the payment flow from fee collections if you want to connect a gateway." });
    setShowLoadModal(false);
    setLoadAmount("");
  };

  if (!activeChildId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
        <div className="font-semibold text-foreground">No child selected</div>
        <p className="text-sm text-muted-foreground mt-1">Select a child profile from the top bar.</p>
      </div>
    );
  }

  const transactions = wallet?.transactions || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Smart Canteen Wallet" subtitle={`Manage your child's cashless wallet and track daily spending for ${activeChildName}.`} />

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading wallet...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-emerald-600 text-white">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <CreditCard className="h-24 w-24 transform rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-sm font-semibold tracking-wider text-white/80 uppercase">Campus Pay Card</span>
                  <Wallet className="h-6 w-6 text-white/90" />
                </div>
                <div className="mb-2">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-widest">Available Balance</span>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-2xl font-semibold text-white/90">₹</span>
                  <span className="text-5xl font-bold tracking-tight">{wallet?.balance || 0}</span>
                  <span className="text-sm text-white/70 ml-1">.00</span>
                </div>
                <button onClick={() => setShowLoadModal(true)} className="flex-1 bg-white text-primary hover:bg-white/90 font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                  <Plus className="h-4 w-4" /> Load Money
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
              <Coffee className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-foreground">Daily Menu</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {wallet?.menu ? (
                    <>
                      Breakfast: <strong>{wallet.menu.breakfast}</strong>
                      <br />
                      Lunch: <strong>{wallet.menu.lunch}</strong>
                    </>
                  ) : (
                    "Canteen menu unavailable for today."
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Panel title="Recent Transactions" action={<History className="h-4 w-4 text-muted-foreground" />}>
              <div className="space-y-3 mt-2">
                {transactions.length === 0 ? (
                  <EmptyState icon={History} title="No Transactions Yet" description="Wallet transactions will appear here once the child uses the canteen card." />
                ) : (
                  transactions.map((txn: any) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${txn.type === "Credit" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          {txn.type === "Credit" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{txn.item}</div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                            {new Date(txn.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-base ${txn.type === "Credit" ? "text-emerald-500" : "text-foreground"}`}>
                        {txn.type === "Credit" ? "+" : "-"}₹{txn.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-foreground text-lg">Top-up Wallet</h3>
              <button onClick={() => setShowLoadModal(false)} className="h-8 w-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80">×</button>
            </div>
            <form onSubmit={handleLoadMoney} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Amount (₹)</label>
                <input type="number" min="50" max="5000" required value={loadAmount} onChange={(event) => setLoadAmount(event.target.value)} className="w-full text-2xl font-bold rounded-xl border border-border bg-background p-3 outline-none focus:border-primary text-center" placeholder="0" />
              </div>
              <div className="flex gap-2">
                {[100, 200, 500].map((amount) => (
                  <button type="button" key={amount} onClick={() => setLoadAmount(amount.toString())} className="flex-1 border border-border rounded-lg py-2 text-sm font-semibold hover:bg-muted transition-colors">
                    +₹{amount}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                <Phone className="h-4 w-4" /> Pay via UPI
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
