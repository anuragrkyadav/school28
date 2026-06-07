import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  ChefHat,
  Clock3,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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

type WalletSummary = {
  id: string;
  studentId: string | null;
  studentName: string;
  grade: string;
  rfidTag: string;
  balance: number;
  status: "Active" | "Frozen";
  lowBalance: boolean;
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

type Allergy = {
  id: string;
  studentId: string | null;
  studentName: string;
  grade: string;
  allergens: string[];
  severity: "High" | "Medium" | "Low";
  status: "Active" | "Monitored";
};

type StudentCanteenMe = {
  student: {
    id: string;
    name: string;
    grade: string;
  };
  wallet: WalletSummary;
  menu: MenuDay;
  todayOrders: Order[];
  allergies: Allergy[];
};

type CanteenOverview = {
  menus: MenuDay[];
  currentDay: MenuDay | null;
};

function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
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

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const Route = createFileRoute("/student/canteen")({
  head: () => ({ meta: [{ title: "Canteen · Campus OS" }] }),
  component: StudentCanteenPage,
});

function StudentCanteenPage() {
  const { user } = useAuth();
  const [me, setMe] = useState<StudentCanteenMe | null>(null);
  const [week, setWeek] = useState<MenuDay[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [meRes, menuRes, ordersRes] = await Promise.all([
        apiClient<unknown>("/canteen/me"),
        apiClient<unknown>("/canteen/menu?week=true"),
        apiClient<unknown>("/canteen/preorders"),
      ]);

      setMe(asRecord<StudentCanteenMe>(meRes));
      const overview = asRecord<CanteenOverview>(menuRes);
      setWeek(overview.menus ?? []);
      setOrders(asList<Order>(ordersRes));
    } catch (error) {
      console.error("Failed to load student canteen data", error);
      toast.error("Unable to load canteen data right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id, user?.studentId]);

  const todayMenu = me?.menu ?? week[0] ?? null;
  const wallet = me?.wallet;
  const myOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !me || order.studentId === me.student.id || order.studentName === me.student.name,
      ),
    [me, orders],
  );

  const placed = myOrders.filter((order) => order.status === "placed");
  const served = myOrders.filter((order) => order.status === "served");
  const cancelled = myOrders.filter((order) => order.status === "cancelled");

  const placeOrder = async (mealSlot: Order["mealSlot"]) => {
    try {
      await apiClient("/canteen/preorders", {
        method: "POST",
        data: {
          mealSlot,
          notes,
        },
      });
      toast.success(`${mealSlot} pre-order placed`);
      setNotes("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Could not place the order");
    }
  };

  const renderMealCard = (
    slot: Order["mealSlot"],
    label: string,
    meal: string,
    nutrition: MealNutrition | null,
  ) => (
    <div className="rounded-2xl border border-border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meal}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-primary">{money(nutrition?.price ?? 0)}</div>
          <div className="text-xs text-muted-foreground">{nutrition?.calories ?? 0} kcal</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Protein: {nutrition?.protein ?? 0}g</div>
        <div>Carbs: {nutrition?.carbs ?? 0}g</div>
        <div>Fat: {nutrition?.fat ?? 0}g</div>
        <div>
          Allergens: {(nutrition?.allergens?.length ? nutrition.allergens.join(", ") : "None").trim()}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Tags: {(nutrition?.dietaryTags?.length ? nutrition.dietaryTags.join(", ") : "None").trim()}
      </div>

      <button
        type="button"
        onClick={() => void placeOrder(slot)}
        disabled={!wallet || wallet.status === "Frozen"}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChefHat className="h-4 w-4" />
        Pre-order {label}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canteen"
        subtitle="Check your balance, review the meal plan, and pre-order meals for the day."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={money(wallet?.balance ?? 0)}
          delta={wallet?.status === "Frozen" ? "Wallet frozen" : "Ready to spend"}
          icon={Wallet}
          tone={wallet?.lowBalance ? "warning" : "success"}
        />
        <StatCard
          label="Orders placed"
          value={String(placed.length)}
          delta="Pending meal pickups"
          icon={BadgeIndianRupee}
        />
        <StatCard
          label="Meals served"
          value={String(served.length)}
          delta="Completed canteen spends"
          icon={ArrowRight}
          tone="info"
        />
        <StatCard
          label="Allergy warnings"
          value={String(me?.allergies?.length ?? 0)}
          delta="Kitchen safety flags"
          icon={ShieldAlert}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Panel
          title="Today’s menu"
          action={
            <span className="text-xs text-muted-foreground">
              {todayMenu?.day ?? "No menu available"}
            </span>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{me?.student.name ?? user?.name ?? "Student"}</h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {me?.student.grade ?? "Grade"}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                RFID {wallet?.rfidTag ?? "N/A"} · Balance {money(wallet?.balance ?? 0)}
                {wallet?.lowBalance ? " · Low balance" : ""}
              </div>
            </div>

            {!todayMenu ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No menu available"
                description="The canteen menu will appear once the admin configures the weekly plan."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {renderMealCard("breakfast", "Breakfast", todayMenu.breakfast, todayMenu.breakfastNutrition)}
                {renderMealCard("lunch", "Lunch", todayMenu.lunch, todayMenu.lunchNutrition)}
                {renderMealCard("snacks", "Snacks", todayMenu.snacks, todayMenu.snacksNutrition)}
                {renderMealCard("dinner", "Dinner", todayMenu.dinner, todayMenu.dinnerNutrition)}
              </div>
            )}

            <div className="rounded-2xl border border-border p-4">
              <label className="mb-2 block text-sm font-medium">Optional note for the kitchen</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Example: please keep the meal nut-free"
              />
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Allergy alerts">
            <div className="space-y-3">
              {me?.allergies?.length ? (
                me.allergies.map((record) => (
                  <div key={record.id} className="rounded-xl border border-border p-3">
                    <div className="font-semibold">{record.studentName}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.grade} · {record.severity} · {record.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {record.allergens.map((allergen) => (
                        <span key={allergen} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="No allergy records"
                  description="If the kitchen has a restriction for you, it will appear here."
                />
              )}
            </div>
          </Panel>

          <Panel title="Order history">
            <div className="space-y-3">
              {myOrders.length ? (
                myOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{order.mealName}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.mealSlot} · {dateLabel(order.mealDate)}
                        </div>
                        {order.notes && <div className="mt-1 text-xs text-muted-foreground">{order.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{money(order.amount)}</div>
                        <div className="text-xs text-muted-foreground">{order.status}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="No pre-orders yet"
                  description="Tap any meal card to place your first order for the day."
                />
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Weekly menu preview">
        <div className="space-y-3">
          {week.map((day) => (
            <div key={day.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{day.day}</div>
                  <div className="text-xs text-muted-foreground">
                    Breakfast {money(day.breakfastNutrition?.price ?? 0)} · Lunch {money(day.lunchNutrition?.price ?? 0)} · Snacks {money(day.snacksNutrition?.price ?? 0)} · Dinner {money(day.dinnerNutrition?.price ?? 0)}
                  </div>
                </div>
                {todayMenu?.day === day.day ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Today
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {week.length === 0 && (
            <EmptyState
              icon={Sparkles}
              title="Weekly menu unavailable"
              description="Once the canteen admin saves the weekly plan, it will show here."
            />
          )}
        </div>
      </Panel>

      {loading && (
        <div className="fixed bottom-6 right-6 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg">
          Loading canteen data...
        </div>
      )}
    </div>
  );
}
