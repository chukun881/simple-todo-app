"use client";
// This page is a Client Component: it needs the token from localStorage
// (browser only) and lots of interactive state, so it runs in the browser
// and talks to the Django API directly with fetch.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CategoryManager from "@/components/CategoryManager";
import TodoForm from "@/components/TodoForm";
import TodoItem from "@/components/TodoItem";
import { api, getFieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category, Todo, TodoInput } from "@/lib/types";

type StatusFilter = "all" | "active" | "completed";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function HomePage() {
  const { user, status, logout } = useAuth();
  const router = useRouter();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this number re-runs the "load todos" effect below. It's a simple
  // way to say "fetch the list again" after we add, edit or delete something.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  // Protect the page: send logged-out visitors to /login.
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  // Load the categories once we're logged in.
  useEffect(() => {
    if (status !== "authenticated") return;
    api<Category[]>("/categories/")
      .then(setCategories)
      .catch((err) => setError(getFieldErrors(err).form ?? "Could not load categories."));
  }, [status]);

  // Load the todos whenever a filter changes (or reload() is called).
  // The filtering happens on the server via query parameters.
  useEffect(() => {
    if (status !== "authenticated") return;

    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("completed", String(statusFilter === "completed"));
    if (categoryFilter !== null) params.set("category", String(categoryFilter));
    const query = params.size > 0 ? `?${params}` : "";

    // `ignore` stops an old, slow response from overwriting a newer one
    // when the user clicks between filters quickly.
    let ignore = false;
    api<Todo[]>(`/todos/${query}`)
      .then((data) => {
        if (ignore) return;
        setTodos(data);
        setError(null);
      })
      .catch((err) => {
        if (!ignore) setError(getFieldErrors(err).form ?? "Could not load your todos.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [status, statusFilter, categoryFilter, reloadKey]);

  // ---- Actions passed down to the components -------------------------------
  // Form actions (create/edit/category) let errors bubble up so the form can
  // show them next to the fields. Quick actions (toggle/delete) show a banner.

  async function createTodo(input: TodoInput) {
    await api<Todo>("/todos/", { method: "POST", body: input });
    reload();
  }

  async function saveTodo(todo: Todo, input: TodoInput) {
    await api<Todo>(`/todos/${todo.id}/`, { method: "PATCH", body: input });
    reload();
  }

  async function toggleTodo(todo: Todo) {
    try {
      await api<Todo>(`/todos/${todo.id}/`, { method: "PATCH", body: { is_completed: !todo.is_completed } });
      reload();
    } catch (err) {
      setError(getFieldErrors(err).form ?? "Could not update the todo.");
    }
  }

  async function deleteTodo(todo: Todo) {
    try {
      await api(`/todos/${todo.id}/`, { method: "DELETE" });
      reload();
    } catch (err) {
      setError(getFieldErrors(err).form ?? "Could not delete the todo.");
    }
  }

  async function createCategory(name: string, color: string) {
    const created = await api<Category>("/categories/", { method: "POST", body: { name, color } });
    // Keep the list sorted by name, like the API returns it.
    setCategories((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteCategory(category: Category) {
    try {
      await api(`/categories/${category.id}/`, { method: "DELETE" });
      setCategories((list) => list.filter((c) => c.id !== category.id));
      if (categoryFilter === category.id) setCategoryFilter(null);
      reload(); // todos in that category now have no category
    } catch (err) {
      setError(getFieldErrors(err).form ?? "Could not delete the category.");
    }
  }

  // While we check the saved token (or redirect), show a quiet placeholder.
  if (status !== "authenticated" || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-sm text-muted">Loading...</p>
      </main>
    );
  }

  const activeCategory = categories.find((c) => c.id === categoryFilter);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between border-b border-line py-5">
        <span className="font-serif text-2xl">Todo App</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">
            Signed in as <span className="font-medium text-ink">{user.username}</span>
          </span>
          <button type="button" onClick={logout} className="btn-ghost border border-line">
            Log out
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="md:order-none order-last">
          <CategoryManager
            categories={categories}
            selectedId={categoryFilter}
            onSelect={setCategoryFilter}
            onCreate={createCategory}
            onDelete={deleteCategory}
          />
        </aside>

        <main className="min-w-0">
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
            {activeCategory ? activeCategory.name : "Your list"}
          </h1>

          <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <TodoForm categories={categories} submitLabel="Add todo" onSubmit={createTodo} />
          </div>

          {/* Filter tabs */}
          <div className="mt-8 inline-flex rounded-lg border border-line bg-card p-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-md px-4 py-1.5 text-sm transition ${
                  statusFilter === tab.value ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="font-medium hover:underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-4">
            {loading ? (
              <ul className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="h-[74px] animate-pulse rounded-xl border border-line bg-card" />
                ))}
              </ul>
            ) : todos.length === 0 ? (
              <EmptyState filter={statusFilter} />
            ) : (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    categories={categories}
                    onToggle={toggleTodo}
                    onSave={saveTodo}
                    onDelete={deleteTodo}
                  />
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: StatusFilter }) {
  const text = {
    all: "Nothing here yet. Add your first todo above.",
    active: "All done. Nothing left to do.",
    completed: "Nothing completed yet.",
  }[filter];
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-serif text-2xl">Clear.</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
