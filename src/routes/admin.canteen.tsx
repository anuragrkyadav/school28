import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Filter,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  Wifi,
  BadgeIndianRupee,
  Soup,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/module-shell";

type MealNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
  dietaryTags: string[];
  price: number;
};

type MenuDay = {
  id: string;
  day: string;
  breakfast: string;
  breakfastNutrition: MealNutrition | null;
  lunch: string;
  lunchNutrition: MealNutrition | null;
  snacks: string;
  snacksNutrition: MealNutrition | null;
  dinner: string;
  dinnerNutrition: MealNutrition | null;
};

type Wallet = {
  id: string;
  studentId: string | null;
  studentName: string;
  grade: string;
  rfidTag: string;
  balance: number;
  status: "Active" | "Frozen";
  lowBalance: boolean;
};

type Allergy = {
  id: string;
  studentId: string | null;
  studentName: string;
  grade: string;
  allergens: string[];
  severity: "High" | "Medium" | "Low";
  status: "Active" | "Monitored";
};

type Order = {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  mealDate: string;
  mealSlot: "breakfast" | "lunch" | "snacks" | "dinner";
  mealName: string;
  amount: number;
  status: "placed" | "prepared" | "served" | "cancelled";
  dietaryTags: string[];
  notes: string | null;
};

type Transaction = {
  id: string;
  studentName: string;
  grade: string;
  rfidTag: string;
  amount: number;
  item: string;
  type: "Debit" | "Credit";
  mealSlot: string | null;
  mealDate: string | null;
  timestamp: string | null;
};

type DailyReport = {
  date: string;
  revenue: number;
  totalOrders: number;
  debitTransactions: number;
  creditTransactions: number;
  lowBalanceAlerts: number;
  allergyAlerts: number;
  mealBreakdown: Record<
    "breakfast" | "lunch" | "snacks" | "dinner",
    { count: number; revenue: number }
  >;
  topMeals: Array<{ mealName: string; amount: number }>;
  menu: MenuDay | null;
  orders: Order[];
  transactions: Transaction[];
  wallets: Wallet[];
  allergyRecords: Allergy[];
};

type MenuPayload = {
  breakfast: string;
  breakfastNutrition: MealNutrition;
  lunch: string;
  lunchNutrition: MealNutrition;
  snacks: string;
  snacksNutrition: MealNutrition;
  dinner: string;
  dinnerNutrition: MealNutrition;
};

type CanteenOverview = {
  menus: MenuDay[];
  currentDay: MenuDay | null;
};

type CanteenPayload<T> = T[] | { data?: T[] } | { data?: T };

function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const data = (payload as { data?: T[] }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

function asRecord<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    const data = (payload as { data?: T }).data;
    if (data !== undefined) return data;
  }
  return payload as T;
}

function mealTemplate(price: number, allergens: string[] = [], dietaryTags: string[] = ["vegetarian"]): MealNutrition {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    allergens,
    dietaryTags,
    price,
  };
}

function createEmptyMenu(day = "Monday"): MenuDay {
  return {
    id: `draft-${day}`,
    day,
    breakfast: "",
    breakfastNutrition: mealTemplate(35),
    lunch: "",
    lunchNutrition: mealTemplate(70),
    snacks: "",
    snacksNutrition: mealTemplate(30),
    dinner: "",
    dinnerNutrition: mealTemplate(80),
  };
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const Route = createFileRoute("/admin/canteen")({
  head: () => ({ meta: [{ title: "Canteen & Mess · Campus OS" }] }),
  component: AdminCanteenPage,
});

function AdminCanteenPage() {
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<MenuDay[]>([]);
  const [currentDayMenu, setCurrentDayMenu] = useState<MenuDay | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"overview" | "menu" | "wallets" | "records">("overview");
  const [editingMenu, setEditingMenu] = useState<MenuDay | null>(null);
  const [topUpWalletId, setTopUpWalletId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [topUpNote, setTopUpNote] = useState("Parent wallet top-up");
  const [showTopUp, setShowTopUp] = useState(false);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    studentName: "",
    grade: "",
    allergens: "",
    severity: "High" as Allergy["severity"],
    status: "Active" as Allergy["status"],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, walletsRes, allergiesRes, reportRes, ordersRes, transactionsRes] = await Promise.all([
        apiClient<unknown>("/canteen/menu?week=true"),
        apiClient<unknown>("/canteen/wallets"),
        apiClient<unknown>("/canteen/allergies"),
        apiClient<unknown>(`/canteen/reports/daily?date=${selectedDate}`),
        apiClient<unknown>(`/canteen/preorders?date=${selectedDate}`),
        apiClient<unknown>(`/canteen/transactions?date=${selectedDate}`),
      ]);

      const overview = asRecord<CanteenOverview>(overviewRes);
      setMenu(overview.menus ?? []);
      setCurrentDayMenu(overview.currentDay ?? null);
      setWallets(asList<Wallet>(walletsRes));
      setAllergies(asList<Allergy>(allergiesRes));
      setReport(asRecord<DailyReport>(reportRes));
      setOrders(asList<Order>(ordersRes));
      setTransactions(asList<Transaction>(transactionsRes));
    } catch (error) {
      console.error("Failed to load canteen data", error);
      toast.error("Unable to load canteen data from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedDate]);

  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return wallets;
    return wallets.filter((wallet) =>
      [wallet.studentName, wallet.grade, wallet.rfidTag, wallet.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, wallets]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.studentName, order.grade, order.mealName, order.mealSlot, order.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [orders, search]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((tx) =>
      [tx.studentName, tx.grade, tx.rfidTag, tx.item, tx.type]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, transactions]);

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
  const lowBalanceCount = wallets.filter((wallet) => wallet.lowBalance).length;
  const frozenCount = wallets.filter((wallet) => wallet.status === "Frozen").length;
  const highSeverityAllergies = allergies.filter((record) => record.severity === "High").length;

  const saveMenu = async () => {
    if (!editingMenu) return;
    const payload: MenuPayload = {
      breakfast: editingMenu.breakfast,
      breakfastNutrition: editingMenu.breakfastNutrition ?? mealTemplate(35),
      lunch: editingMenu.lunch,
      lunchNutrition: editingMenu.lunchNutrition ?? mealTemplate(70),
      snacks: editingMenu.snacks,
      snacksNutrition: editingMenu.snacksNutrition ?? mealTemplate(30),
      dinner: editingMenu.dinner,
      dinnerNutrition: editingMenu.dinnerNutrition ?? mealTemplate(80),
    };

    try {
      await apiClient(`/canteen/menu/${encodeURIComponent(editingMenu.day)}`, {
        method: "PUT",
        data: payload,
      });
      toast.success(`${editingMenu.day} menu saved`);
      setEditingMenu(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save the menu");
    }
  };

  const submitTopUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topUpWalletId) {
      toast.error("Pick a wallet first");
      return;
    }
    try {
      await apiClient(`/canteen/wallets/${topUpWalletId}/topup`, {
        method: "POST",
        data: { amount: Number(topUpAmount || 0), note: topUpNote },
      });
      toast.success("Wallet topped up");
      setShowTopUp(false);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Top-up failed");
    }
  };

  const submitAllergy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await apiClient("/canteen/allergies", {
        method: "POST",
        data: {
          studentName: allergyForm.studentName,
          grade: allergyForm.grade,
          allergens: allergyForm.allergens
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          severity: allergyForm.severity,
          status: allergyForm.status,
        },
      });
      toast.success("Allergy record added");
      setShowAllergyForm(false);
      setAllergyForm({
        studentName: "",
        grade: "",
        allergens: "",
        severity: "High",
        status: "Active",
      });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add allergy record");
    }
  };

  const toggleWallet = async (wallet: Wallet) => {
    try {
      await apiClient(`/canteen/wallets/${wallet.id}/status`, {
        method: "PATCH",
        data: { status: wallet.status === "Active" ? "Frozen" : "Active" },
      });
      toast.success(`${wallet.studentName}'s wallet updated`);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update wallet status");
    }
  };

  const updateOrderStatus = async (order: Order, status: Order["status"]) => {
    try {
      await apiClient(`/canteen/orders/${order.id}/status`, {
        method: "PATCH",
        data: { status },
      });
      toast.success(`Order marked as ${status}`);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status");
    }
  };

  const openMenuEditor = (day: MenuDay) => {
    setEditingMenu({
      ...day,
      breakfastNutrition: day.breakfastNutrition ?? mealTemplate(35),
      lunchNutrition: day.lunchNutrition ?? mealTemplate(70),
      snacksNutrition: day.snacksNutrition ?? mealTemplate(30),
      dinnerNutrition: day.dinnerNutrition ?? mealTemplate(80),
    });
  };

  const renderNutrition = (label: string, nutrition: MealNutrition | null) => (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-sm font-bold text-primary">{formatMoney(nutrition?.price ?? 0)}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
        <div>Calories: {nutrition?.calories ?? 0}</div>
        <div>Protein: {nutrition?.protein ?? 0}g</div>
        <div>Carbs: {nutrition?.carbs ?? 0}g</div>
        <div>Fat: {nutrition?.fat ?? 0}g</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Allergens: {(nutrition?.allergens?.length ? nutrition.allergens.join(", ") : "None").trim()}
      </div>
      <div className="text-xs text-muted-foreground">
        Tags: {(nutrition?.dietaryTags?.length ? nutrition.dietaryTags.join(", ") : "None").trim()}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canteen & Cafeteria Management"
        subtitle="Menu planning, wallet top-ups, student pre-orders, allergy tracking, and daily sales reporting"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Daily revenue"
          value={report ? formatMoney(report.revenue) : formatMoney(0)}
          delta={`${report?.totalOrders ?? 0} meals ordered`}
          icon={BadgeIndianRupee}
          tone="success"
        />
        <StatCard
          label="Low balance alerts"
          value={String(lowBalanceCount)}
          delta={`${frozenCount} wallets frozen`}
          icon={AlertTriangle}
          tone={lowBalanceCount > 0 ? "warning" : "info"}
        />
        <StatCard
          label="High-risk allergies"
          value={String(highSeverityAllergies)}
          delta={`${allergies.length} allergy records`}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Wallet reserves"
          value={formatMoney(totalBalance)}
          delta="Combined canteen balance"
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
        {(
          [
            ["overview", "Overview"],
            ["menu", "Menu Planner"],
            ["wallets", "Wallets"],
            ["records", "Orders & Reports"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/25 p-3 text-sm text-muted-foreground">
        <Wifi className="h-4 w-4" />
        Live data comes from the backend. If the database is empty, the menu seeds automatically and wallets are created for students on demand.
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Panel
            title="Today’s menu and meal status"
            action={
              <span className="text-xs text-muted-foreground">
                {currentDayMenu ? currentDayMenu.day : "Menu unavailable"}
              </span>
            }
          >
            <div className="space-y-4">
              {!currentDayMenu ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No menu found"
                  description="The canteen menu will appear here once it is configured."
                />
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{currentDayMenu.day}</h3>
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                        Active menu
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Edit the meal items and nutritional metadata from the Menu Planner tab.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {renderNutrition("Breakfast", currentDayMenu.breakfastNutrition)}
                    {renderNutrition("Lunch", currentDayMenu.lunchNutrition)}
                    {renderNutrition("Snacks", currentDayMenu.snacksNutrition)}
                    {renderNutrition("Dinner", currentDayMenu.dinnerNutrition)}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Quick actions">
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setTab("wallets")}
                  className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div>
                    <div className="font-semibold">Wallet top-up</div>
                    <div className="text-xs text-muted-foreground">Load balance for students</div>
                  </div>
                  <CreditCard className="h-4 w-4 text-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllergyForm(true)}
                  className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div>
                    <div className="font-semibold">Add allergy alert</div>
                    <div className="text-xs text-muted-foreground">Tag ingredients and dietary needs</div>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                </button>
              </div>
            </Panel>

            <Panel title="Sales snapshot">
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Orders today</div>
                  <div className="mt-1 text-lg font-semibold">{report?.totalOrders ?? 0}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Credit loads</div>
                  <div className="mt-1 text-lg font-semibold">{report?.creditTransactions ?? 0}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Debit taps</div>
                  <div className="mt-1 text-lg font-semibold">{report?.debitTransactions ?? 0}</div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "menu" && (
        <div className="grid gap-6">
          <Panel
            title="Weekly digital menu"
            action={
              <span className="text-xs text-muted-foreground">
                {menu.length} days configured
              </span>
            }
          >
            <div className="space-y-3">
              {menu.map((day) => (
                <div key={day.id} className="rounded-2xl border border-border p-4 hover:border-primary/30">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{day.day}</h3>
                        {currentDayMenu?.day === day.day ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            Today
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {renderNutrition("Breakfast", day.breakfastNutrition)}
                        {renderNutrition("Lunch", day.lunchNutrition)}
                        {renderNutrition("Snacks", day.snacksNutrition)}
                        {renderNutrition("Dinner", day.dinnerNutrition)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMenuEditor(day)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Sparkles className="h-4 w-4" />
                      Edit menu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "wallets" && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Panel
            title="Student wallet registry"
            action={
              <div className="relative w-72 max-w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student, grade, or RFID tag"
                  className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            }
          >
            <div className="space-y-3">
              {filteredWallets.map((wallet) => (
                <div key={wallet.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{wallet.studentName}</h3>
                        {wallet.lowBalance && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Low balance
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {wallet.grade} · {wallet.rfidTag}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                        {formatMoney(wallet.balance)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTopUpWalletId(wallet.id);
                          setShowTopUp(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                        Top up
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleWallet(wallet)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          wallet.status === "Frozen"
                            ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        }`}
                      >
                        {wallet.status === "Frozen" ? <Lock className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                        {wallet.status}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredWallets.length === 0 && (
                <EmptyState
                  icon={Wallet}
                  title="No wallets matched your search"
                  description="Try a student name, grade, or RFID code."
                />
              )}
            </div>
          </Panel>

          <Panel title="Allergy and dietary tags">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAllergyForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add allergy record
              </button>

              <div className="space-y-3">
                {allergies.map((record) => (
                  <div key={record.id} className="rounded-xl border border-border p-3">
                    <div className="font-semibold">{record.studentName}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.grade} · {record.status} · {record.severity}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {record.allergens.map((tag) => (
                        <span key={tag} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {allergies.length === 0 && (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No allergy records"
                    description="Tag allergies here so the kitchen and staff can see dietary restrictions."
                  />
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "records" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Panel
            title="Orders and daily sales"
            action={
              <span className="text-xs text-muted-foreground">
                {formatDate(selectedDate)}
              </span>
            }
          >
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{order.studentName}</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {order.mealSlot}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {order.grade} · {order.mealName} · {formatDate(order.mealDate)}
                      </div>
                      {order.dietaryTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.dietaryTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatMoney(order.amount)}</div>
                        <div className="text-xs text-muted-foreground">{order.status}</div>
                      </div>
                      <select
                        value={order.status}
                        onChange={(event) => void updateOrderStatus(order, event.target.value as Order["status"])}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                      >
                        <option value="placed">Placed</option>
                        <option value="prepared">Prepared</option>
                        <option value="served">Served</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No orders found"
                  description="Orders for the selected day will appear here after students pre-order meals."
                />
              )}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Daily sales report">
              {report ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</div>
                      <div className="mt-1 text-lg font-semibold">{formatMoney(report.revenue)}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Orders</div>
                      <div className="mt-1 text-lg font-semibold">{report.totalOrders}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Low balance</div>
                      <div className="mt-1 text-lg font-semibold">{report.lowBalanceAlerts}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Allergies</div>
                      <div className="mt-1 text-lg font-semibold">{report.allergyAlerts}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(
                      Object.entries(report.mealBreakdown) as Array<
                        [keyof DailyReport["mealBreakdown"], { count: number; revenue: number }]
                      >
                    ).map(([slot, value]) => (
                      <div key={slot} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span className="font-medium capitalize">{slot}</span>
                        <span className="text-muted-foreground">
                          {value.count} orders · {formatMoney(value.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Top meals</div>
                    {report.topMeals.map((meal) => (
                      <div key={meal.mealName} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span>{meal.mealName}</span>
                        <span className="font-medium">{formatMoney(meal.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={BadgeIndianRupee}
                  title="No report available"
                  description="A report will load when the backend returns the daily sales data."
                />
              )}
            </Panel>

            <Panel title="Transactions">
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">{tx.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {tx.grade} · {tx.item}
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-semibold ${
                          tx.type === "Credit" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.type === "Credit" ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                        {tx.type === "Credit" ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tx.rfidTag}</span>
                      <span>{formatDateTime(tx.timestamp)}</span>
                    </div>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <EmptyState
                    icon={CalendarDays}
                    title="No transactions found"
                    description="Wallet loads and meal spends will show up here."
                  />
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Edit {editingMenu.day} menu</h2>
                <p className="text-sm text-muted-foreground">Update dishes, nutrition, allergens, dietary tags, and price.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {(
                [
                  ["breakfast", "Breakfast"],
                  ["lunch", "Lunch"],
                  ["snacks", "Snacks"],
                  ["dinner", "Dinner"],
                ] as const
              ).map(([slot, label]) => {
                const meal = editingMenu[slot] as string;
                const nutritionKey = `${slot}Nutrition` as const;
                const nutrition = editingMenu[nutritionKey] ?? mealTemplate(slot === "lunch" ? 70 : slot === "dinner" ? 80 : slot === "breakfast" ? 35 : 30);

                return (
                  <div key={slot} className="rounded-2xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{label}</h3>
                      <div className="text-sm font-semibold text-primary">{formatMoney(nutrition.price)}</div>
                    </div>
                    <input
                      value={meal}
                      onChange={(event) =>
                        setEditingMenu((current) =>
                          current ? { ...current, [slot]: event.target.value } : current,
                        )
                      }
                      placeholder={`${label} meal text`}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={nutrition.calories}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: { ...nutrition, calories: Number(event.target.value || 0) },
                                }
                              : current,
                          )
                        }
                        placeholder="Calories"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        value={nutrition.price}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: { ...nutrition, price: Number(event.target.value || 0) },
                                }
                              : current,
                          )
                        }
                        placeholder="Price"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        value={nutrition.protein}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: { ...nutrition, protein: Number(event.target.value || 0) },
                                }
                              : current,
                          )
                        }
                        placeholder="Protein"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        value={nutrition.carbs}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: { ...nutrition, carbs: Number(event.target.value || 0) },
                                }
                              : current,
                          )
                        }
                        placeholder="Carbs"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        value={nutrition.fat}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: { ...nutrition, fat: Number(event.target.value || 0) },
                                }
                              : current,
                          )
                        }
                        placeholder="Fat"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <input
                        value={nutrition.allergens.join(", ")}
                        onChange={(event) =>
                          setEditingMenu((current) =>
                            current
                              ? {
                                  ...current,
                                  [nutritionKey]: {
                                    ...nutrition,
                                    allergens: event.target.value
                                      .split(",")
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  },
                                }
                              : current,
                          )
                        }
                        placeholder="Allergens comma separated"
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <textarea
                      value={nutrition.dietaryTags.join(", ")}
                      onChange={(event) =>
                        setEditingMenu((current) =>
                          current
                            ? {
                                ...current,
                                [nutritionKey]: {
                                  ...nutrition,
                                  dietaryTags: event.target.value
                                    .split(",")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                },
                              }
                            : current,
                        )
                      }
                      rows={2}
                      placeholder="Dietary tags comma separated"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveMenu()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save menu
              </button>
            </div>
          </div>
        </div>
      )}

      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Top up wallet</h2>
              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitTopUp}>
              <div>
                <label className="mb-1 block text-sm font-medium">Wallet</label>
                <select
                  value={topUpWalletId}
                  onChange={(event) => setTopUpWalletId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select a wallet</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.studentName} · {wallet.grade} · {formatMoney(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Amount</label>
                  <input
                    type="number"
                    min={1}
                    value={topUpAmount}
                    onChange={(event) => setTopUpAmount(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Note</label>
                  <input
                    value={topUpNote}
                    onChange={(event) => setTopUpNote(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Load balance
              </button>
            </form>
          </div>
        </div>
      )}

      {showAllergyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Add allergy record</h2>
              <button
                type="button"
                onClick={() => setShowAllergyForm(false)}
                className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitAllergy}>
              <div>
                <label className="mb-1 block text-sm font-medium">Student name</label>
                <input
                  value={allergyForm.studentName}
                  onChange={(event) =>
                    setAllergyForm((current) => ({ ...current, studentName: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Grade</label>
                <input
                  value={allergyForm.grade}
                  onChange={(event) =>
                    setAllergyForm((current) => ({ ...current, grade: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Allergens</label>
                <input
                  value={allergyForm.allergens}
                  onChange={(event) =>
                    setAllergyForm((current) => ({ ...current, allergens: event.target.value }))
                  }
                  placeholder="Peanuts, dairy, gluten"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Severity</label>
                  <select
                    value={allergyForm.severity}
                    onChange={(event) =>
                      setAllergyForm((current) => ({ ...current, severity: event.target.value as Allergy["severity"] }))
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <select
                    value={allergyForm.status}
                    onChange={(event) =>
                      setAllergyForm((current) => ({ ...current, status: event.target.value as Allergy["status"] }))
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Monitored">Monitored</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save allergy record
              </button>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-6 right-6 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg">
          Loading canteen data...
        </div>
      )}
    </div>
  );
}
