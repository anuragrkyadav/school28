import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BookMarked,
  BookOpen,
  Clock3,
  ExternalLink,
  LibraryBig,
  AlertTriangle,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/module-shell";
import { apiClient } from "@/lib/api-client";
import { getInitialStore } from "@/lib/seed-data";

type TabKey = "dashboard" | "catalog" | "issue" | "reservations" | "digital";

type LibraryBook = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  total_copies: number;
  available_copies: number;
  shelf?: string;
  resource_type?: "physical" | "digital";
  resource_url?: string | null;
  low_stock_threshold?: number;
  is_low_stock?: boolean;
};

type Circulation = {
  id: string;
  book_id: string;
  book_title: string;
  student_id: string;
  student_name: string;
  issued_date: string;
  due_date: string;
  returned_date?: string | null;
  status: "issued" | "returned" | "overdue";
  fine_amount?: number;
  fine_paid?: number;
  fine_status?: "none" | "pending" | "paid";
};

type Reservation = {
  id: string;
  book_id: string;
  book_title: string;
  student_id: string;
  student_name: string;
  reserved_at: string;
  expires_at: string;
  status: "active" | "fulfilled" | "cancelled" | "expired";
  note?: string | null;
};

type LibraryStats = {
  total_titles: number;
  total_copies: number;
  available_copies: number;
  issued_copies: number;
  low_stock_count: number;
  digital_titles: number;
  active_reservations: number;
  overdue_circulations: number;
  circulation_percentage: number;
  low_stock_books: LibraryBook[];
};

const initialFallback = getInitialStore();

const STUDENT_OPTIONS = [
  { id: "a10e8400-e29b-41d4-a716-446655440001", name: "Aarav Sharma", parent: "Rajesh Sharma" },
  { id: "a10e8400-e29b-41d4-a716-446655440002", name: "Diya Patel", parent: "Neha Patel" },
  { id: "a10e8400-e29b-41d4-a716-446655440003", name: "Rohan Verma", parent: "Sunil Verma" },
  { id: "a10e8400-e29b-41d4-a716-446655440004", name: "Ananya Singh", parent: "Meera Singh" },
  { id: "a10e8400-e29b-41d4-a716-446655440005", name: "Kabir Mehta", parent: "Anil Mehta" },
];

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

function formatDate(value?: string) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const Route = createFileRoute("/admin/library")({
  head: () => ({ meta: [{ title: "Library · Campus OS" }] }),
  component: Page,
});

function Page() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [circulations, setCirculations] = useState<Circulation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [issueForm, setIssueForm] = useState({
    bookId: "",
    studentId: STUDENT_OPTIONS[0]?.id ?? "",
    studentName: STUDENT_OPTIONS[0]?.name ?? "",
    dueDateDays: 14,
  });

  const [reserveForm, setReserveForm] = useState({
    bookId: "",
    studentId: STUDENT_OPTIONS[0]?.id ?? "",
    studentName: STUDENT_OPTIONS[0]?.name ?? "",
    note: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, circulationsRes, reservationsRes, statsRes] = await Promise.all([
        apiClient<unknown>("/library/books"),
        apiClient<unknown>("/library/circulations"),
        apiClient<unknown>("/library/reservations"),
        apiClient<unknown>("/library/statistics"),
      ]);

      setBooks(asList<LibraryBook>(booksRes));
      setCirculations(asList<Circulation>(circulationsRes));
      setReservations(asList<Reservation>(reservationsRes));
      setStats(asRecord<LibraryStats>(statsRes));
    } catch (error) {
      console.error("Failed to load library data", error);
      const fallbackBooks = initialFallback.libraryBooks.map((book: any) => ({
        id: String(book.id),
        title: String(book.title),
        author: String(book.author),
        isbn: book.isbn ? String(book.isbn) : undefined,
        category: String(book.category),
        total_copies: Number(book.totalCopies ?? 0),
        available_copies: Number(book.available ?? 0),
        shelf: book.shelf ? String(book.shelf) : undefined,
        resource_type: book.resourceType === "digital" ? "digital" : "physical",
        resource_url: book.resourceUrl ?? null,
        low_stock_threshold: 2,
        is_low_stock: Number(book.available ?? 0) <= 2,
      }));

      setBooks(fallbackBooks);
      setCirculations(
        initialFallback.bookCirculations.map((c: any) => ({
          id: String(c.id),
          book_id: String(c.bookId),
          book_title: String(c.bookTitle),
          student_id: String(c.studentId),
          student_name: String(c.studentName),
          issued_date: String(c.issuedDate),
          due_date: String(c.dueDate),
          returned_date: c.returnedDate ? String(c.returnedDate) : null,
          status: String(c.status) as Circulation["status"],
          fine_amount: 0,
          fine_paid: 0,
          fine_status: "none",
        })),
      );
      setReservations([]);
      setStats({
        total_titles: fallbackBooks.length,
        total_copies: fallbackBooks.reduce((sum, book) => sum + book.total_copies, 0),
        available_copies: fallbackBooks.reduce((sum, book) => sum + book.available_copies, 0),
        issued_copies: fallbackBooks.reduce((sum, book) => sum + (book.total_copies - book.available_copies), 0),
        low_stock_count: fallbackBooks.filter((book) => book.is_low_stock).length,
        digital_titles: fallbackBooks.filter((book) => book.resource_type === "digital").length,
        active_reservations: 0,
        overdue_circulations: initialFallback.bookCirculations.filter((c: any) => c.status === "overdue").length,
        circulation_percentage:
          fallbackBooks.length > 0
            ? Math.round(
                (fallbackBooks.reduce((sum, book) => sum + (book.total_copies - book.available_copies), 0) /
                  fallbackBooks.reduce((sum, book) => sum + book.total_copies, 0)) *
                  100,
              )
            : 0,
        low_stock_books: fallbackBooks.filter((book) => book.is_low_stock),
      });
      toast.info("Showing sample library data", {
        description: "The backend library API was unavailable, so the page loaded the local catalog.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const lowStockBooks = stats?.low_stock_books ?? books.filter((book) => book.is_low_stock);
  const digitalBooks = books.filter((book) => book.resource_type === "digital");
  const activeCirculations = circulations.filter((circulation) => circulation.status !== "returned");
  const returnedCirculations = circulations.filter((circulation) => circulation.status === "returned");
  const overdueCirculations = circulations.filter((circulation) => circulation.status === "overdue");

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return books;
    return books.filter((book) =>
      [book.title, book.author, book.category, book.isbn, book.shelf, book.resource_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [books, search]);

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reservations;
    return reservations.filter((reservation) =>
      [reservation.book_title, reservation.student_name, reservation.status, reservation.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [reservations, search]);

  const studentMeta = STUDENT_OPTIONS.find((student) => student.id === issueForm.studentId);
  const reserveStudentMeta = STUDENT_OPTIONS.find((student) => student.id === reserveForm.studentId);

  const issueBook = async () => {
    if (!issueForm.bookId) {
      toast.error("Select a book to issue");
      return;
    }
    try {
      await apiClient("/library/circulations/issue", {
        method: "POST",
        data: issueForm,
      });
      toast.success("Book issued successfully");
      await loadData();
      setTab("dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to issue book");
    }
  };

  const reserveBook = async () => {
    if (!reserveForm.bookId) {
      toast.error("Select a book to reserve");
      return;
    }
    try {
      await apiClient("/library/reservations", {
        method: "POST",
        data: reserveForm,
      });
      toast.success("Reservation created");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to reserve book");
    }
  };

  const returnBook = async (circulationId: string, title: string) => {
    try {
      const result = await apiClient<any>(`/library/circulations/${circulationId}/return`, {
        method: "POST",
      });
      const fineAmount = Number(result?.fine_amount ?? 0);
      toast.success("Book returned", {
        description: fineAmount > 0 ? `${title} returned with a fine of ₹${fineAmount}.` : title,
      });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to return book");
    }
  };

  const setIssueStudent = (studentId: string) => {
    const selected = STUDENT_OPTIONS.find((student) => student.id === studentId);
    if (!selected) return;
    setIssueForm((current) => ({ ...current, studentId, studentName: selected.name }));
  };

  const setReserveStudent = (studentId: string) => {
    const selected = STUDENT_OPTIONS.find((student) => student.id === studentId);
    if (!selected) return;
    setReserveForm((current) => ({ ...current, studentId, studentName: selected.name }));
  };

  const renderBookRow = (book: LibraryBook) => (
    <div key={book.id} className="rounded-2xl border border-border p-4 transition-colors hover:border-accent/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{book.title}</h3>
            {book.resource_type === "digital" && (
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                Digital
              </span>
            )}
            {book.is_low_stock && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                Low stock
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {book.author} · {book.category} · Shelf {book.shelf ?? "N/A"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ISBN {book.isbn ?? "N/A"} · Available {book.available_copies}/{book.total_copies}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {book.resource_type === "digital" && book.resource_url && (
            <a
              href={book.resource_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Open resource
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setIssueForm((current) => ({ ...current, bookId: book.id }));
              setTab("issue");
            }}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Issue
          </button>
          <button
            type="button"
            onClick={() => {
              setReserveForm((current) => ({ ...current, bookId: book.id }));
              setTab("reservations");
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Library Management"
        subtitle="Inventory, circulation, reservations, fine tracking, and digital study resources"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          label="Total Titles"
          value={String(stats?.total_titles ?? books.length)}
          icon={BookOpen}
          tone="info"
        />
        <StatCard
          label="Books Issued"
          value={String(stats?.issued_copies ?? activeCirculations.length)}
          icon={BookMarked}
        />
        <StatCard
          label="Low Stock"
          value={String(stats?.low_stock_count ?? lowStockBooks.length)}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Digital Resources"
          value={String(stats?.digital_titles ?? digitalBooks.length)}
          icon={Sparkles}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 rounded-2xl border border-border bg-card p-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["catalog", "Catalog"],
            ["issue", "Issue / Return"],
            ["reservations", "Reservations"],
            ["digital", "Digital Shelf"],
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
      </div>

      {tab === "dashboard" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Panel
            title="Active Circulations"
            action={
              <span className="text-xs text-muted-foreground">
                {overdueCirculations.length} overdue · {returnedCirculations.length} returned
              </span>
            }
          >
            <div className="space-y-3">
              {activeCirculations.map((circulation) => (
                <div
                  key={circulation.id}
                  className="rounded-2xl border border-border p-4 transition-colors hover:border-accent/30"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-semibold">{circulation.book_title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {circulation.student_name} · Issued {formatDate(circulation.issued_date)} · Due{" "}
                        {formatDate(circulation.due_date)}
                      </div>
                      {Number(circulation.fine_amount ?? 0) > 0 && (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          Fine due: ₹{circulation.fine_amount}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          circulation.status === "overdue"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {circulation.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => returnBook(circulation.id, circulation.book_title)}
                        className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/25"
                      >
                        Return
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {activeCirculations.length === 0 && (
                <EmptyState
                  icon={BookOpen}
                  title="No books are currently issued"
                  description="Issue a study book to see live circulation tracking here."
                />
              )}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Library Alerts">
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 font-semibold text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Low stock watchlist
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lowStockBooks.length} titles need restocking or purchase review.
                  </p>
                </div>
                {lowStockBooks.slice(0, 5).map((book) => (
                  <div key={book.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{book.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {book.category} · {book.available_copies}/{book.total_copies}
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Reorder
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Reservation Queue">
              <div className="space-y-3">
                {reservations.slice(0, 4).map((reservation) => (
                  <div key={reservation.id} className="rounded-xl border border-border p-3">
                    <div className="font-medium text-sm">{reservation.book_title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {reservation.student_name} · Expires {formatDate(reservation.expires_at)}
                    </div>
                  </div>
                ))}
                {reservations.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No reservations yet.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <Panel title="Book Catalog">
          <div className="mb-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search books, authors, ISBNs, shelves, or resource type..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-3">
            {filteredBooks.map(renderBookRow)}
            {filteredBooks.length === 0 && (
              <EmptyState
                icon={LibraryBig}
                title="No matching books"
                description="Try a different search term or add a new title to the catalog."
              />
            )}
          </div>
        </Panel>
      )}

      {tab === "issue" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Issue Study Book">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Book</label>
                <select
                  value={issueForm.bookId}
                  onChange={(event) => setIssueForm((current) => ({ ...current, bookId: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select a book</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} ({book.available_copies}/{book.total_copies})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Student</label>
                  <select
                  value={issueForm.studentId}
                  onChange={(event) => {
                    setIssueStudent(event.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {STUDENT_OPTIONS.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} · Parent {student.parent}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Student Name</label>
                <input
                  value={issueForm.studentName}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, studentName: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Due in Days</label>
                <input
                  type="number"
                  min={1}
                  value={issueForm.dueDateDays}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, dueDateDays: Number(event.target.value) || 14 }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={issueBook}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Issue Selected Book
              </button>
            </div>
          </Panel>

          <Panel title="Reserve a Book">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Book</label>
                <select
                  value={reserveForm.bookId}
                  onChange={(event) =>
                    setReserveForm((current) => ({ ...current, bookId: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select a book</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Student / Parent Name</label>
                <input
                  value={reserveForm.studentName}
                  onChange={(event) =>
                    setReserveForm((current) => ({ ...current, studentName: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Profile</label>
                  <select
                  value={reserveForm.studentId}
                  onChange={(event) => {
                    setReserveStudent(event.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {STUDENT_OPTIONS.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Reservation Note</label>
                <textarea
                  value={reserveForm.note}
                  onChange={(event) => setReserveForm((current) => ({ ...current, note: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Optional reservation note"
                />
              </div>

              <button
                type="button"
                onClick={reserveBook}
                className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80"
              >
                Create Reservation
              </button>
            </div>
          </Panel>
        </div>
      )}

      {tab === "reservations" && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Reservation Queue">
            <div className="space-y-3">
              {filteredReservations.map((reservation) => (
                <div key={reservation.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{reservation.book_title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {reservation.student_name} · Reserved {formatDate(reservation.reserved_at)} · Expires{" "}
                        {formatDate(reservation.expires_at)}
                      </div>
                      {reservation.note && (
                        <div className="mt-2 text-xs text-muted-foreground">{reservation.note}</div>
                      )}
                    </div>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredReservations.length === 0 && (
                <EmptyState
                  icon={UserRound}
                  title="No reservations found"
                  description="Reservations will appear here once students or parents place a hold."
                />
              )}
            </div>
          </Panel>

          <Panel title="Search by Student or Parent">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the search box above to look up reservations by student name, parent note, or book title.
              </p>
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Clock3 className="h-4 w-4" />
                  Reservation behavior
                </div>
                <ul className="mt-3 space-y-2">
                  <li>• Active reservations are held for 7 days.</li>
                  <li>• Issuing a reserved book will automatically fulfill matching reservations.</li>
                  <li>• Students and parents can reserve from the same book catalog used by staff.</li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {STUDENT_OPTIONS.map((student) => (
                  <div key={student.id} className="rounded-xl border border-border p-3">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground">Parent: {student.parent}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "digital" && (
        <Panel title="Digital Study Resources">
          <div className="space-y-3">
            {digitalBooks.map((book) => (
              <div key={book.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold">{book.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {book.author} · {book.category}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Shelf {book.shelf ?? "Digital"}</div>
                  </div>
                  {book.resource_url ? (
                    <a
                      href={book.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open resource
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
            {digitalBooks.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title="No digital titles"
                description="Add e-books, PDFs, and study links to build the digital resource shelf."
              />
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
