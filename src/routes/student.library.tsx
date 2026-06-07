import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Search,
  Sparkles,
  BookMarked,
  AlertTriangle,
  LibraryBig,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/module-shell";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

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

type ApiListResponse<T> = T[] | { data?: T[] };

function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as ApiListResponse<T>).data)) {
    return (payload as { data: T[] }).data ?? [];
  }
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const Route = createFileRoute("/student/library")({
  head: () => ({ meta: [{ title: "Library · Campus OS" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [circulations, setCirculations] = useState<Circulation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const studentId = user?.studentId ?? user?.id;
        const [booksRes, circulationsRes] = await Promise.all([
          apiClient<unknown>("/library/books"),
          studentId ? apiClient<unknown>(`/library/circulations/student/${studentId}`) : Promise.resolve([] as unknown),
        ]);

        setBooks(asList<LibraryBook>(booksRes));
        setCirculations(asList<Circulation>(circulationsRes));
      } catch (error) {
        console.error("Failed to load student library data", error);
        toast.info("Library data is unavailable right now", {
          description: "The page will still open, but borrowing details may be limited until the backend responds.",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, user?.studentId]);

  const query = search.trim().toLowerCase();

  const filteredBooks = useMemo(() => {
    if (!query) return books;
    return books.filter((book) =>
      [book.title, book.author, book.category, book.isbn, book.shelf, book.resource_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [books, query]);

  const myBooks = useMemo(() => {
    const studentId = user?.studentId ?? user?.id;
    return circulations.filter(
      (item) =>
        item.student_id === studentId ||
        item.student_name.toLowerCase() === (user?.name ?? "").toLowerCase(),
    );
  }, [circulations, user?.id, user?.name, user?.studentId]);

  const issuedBooks = myBooks.filter((item) => item.status === "issued");
  const overdueBooks = myBooks.filter((item) => item.status === "overdue");
  const returnedBooks = myBooks.filter((item) => item.status === "returned");

  const totalFine = myBooks.reduce((sum, item) => sum + Number(item.fine_amount ?? 0), 0);
  const totalAvailable = books.reduce((sum, book) => sum + Number(book.available_copies ?? 0), 0);
  const digitalBooks = books.filter((book) => book.resource_type === "digital");
  const lowStockBooks = books.filter((book) => book.is_low_stock);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        subtitle="Search the study catalog and track your borrowed books, due dates, and fines."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Borrowed now"
          value={String(issuedBooks.length)}
          delta={`${overdueBooks.length} overdue`}
          icon={BookMarked}
          tone={overdueBooks.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Total fines"
          value={`₹${totalFine.toLocaleString()}`}
          delta={totalFine > 0 ? "Clear fines at the library desk" : "No pending fines"}
          icon={AlertTriangle}
          tone={totalFine > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Digital books"
          value={String(digitalBooks.length)}
          delta="Open ebooks and study links"
          icon={Sparkles}
          tone="info"
        />
        <StatCard
          label="Available titles"
          value={String(books.length)}
          delta={`${totalAvailable} copies in stock`}
          icon={BookOpen}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel title="Book Catalog">
          <div className="mb-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search books, authors, ISBNs, categories..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Loading library catalog...
              </div>
            ) : filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <div key={book.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{book.title}</h3>
                        {book.resource_type === "digital" && (
                          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                            Digital
                          </span>
                        )}
                        {book.is_low_stock && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Low stock
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {book.author} · {book.category} · Shelf {book.shelf ?? "N/A"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        ISBN {book.isbn ?? "N/A"} · Available {book.available_copies}/{book.total_copies}
                      </div>
                    </div>
                    {book.resource_type === "digital" && book.resource_url && (
                      <a
                        href={book.resource_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                      >
                        <FileText className="h-4 w-4" />
                        Open resource
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={LibraryBig}
                title="No matching books"
                description="Try another keyword or browse the full catalog."
              />
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="My Borrowing Status">
            <div className="space-y-3">
              {myBooks.length > 0 ? (
                myBooks.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{record.book_title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Issued {formatDate(record.issued_date)} · Due {formatDate(record.due_date)}
                        </div>
                        {record.returned_date && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Returned {formatDate(record.returned_date)}
                          </div>
                        )}
                        {Number(record.fine_amount ?? 0) > 0 && (
                          <div className="mt-2 text-xs font-semibold text-destructive">
                            Fine due: ₹{record.fine_amount}
                          </div>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          record.status === "overdue"
                            ? "bg-destructive/10 text-destructive"
                            : record.status === "issued"
                              ? "bg-accent/10 text-accent"
                              : "bg-emerald-500/10 text-emerald-700"
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="No borrowing history yet"
                  description="Your issued books, due dates, and fine status will appear here once you borrow from the library."
                />
              )}
            </div>
          </Panel>

          <Panel title="Quick Facts">
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Currently issued</div>
                <div className="mt-1 text-lg font-semibold">{issuedBooks.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Returned books</div>
                <div className="mt-1 text-lg font-semibold">{returnedBooks.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Overdue books</div>
                <div className="mt-1 text-lg font-semibold">{overdueBooks.length}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Low stock notices</div>
                <div className="mt-1 text-lg font-semibold">{lowStockBooks.length}</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Digital Shelf">
        <div className="space-y-3">
          {digitalBooks.length > 0 ? (
            digitalBooks.map((book) => (
              <div key={book.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold">{book.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {book.author} · {book.category}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Available online for study support</div>
                  </div>
                  {book.resource_url ? (
                    <a
                      href={book.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Open resource
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No digital resources available"
              description="The library team can add e-books and study links here."
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
