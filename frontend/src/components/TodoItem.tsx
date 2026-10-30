"use client";

import { useState } from "react";
import TodoForm from "@/components/TodoForm";
import type { Category, Todo, TodoInput } from "@/lib/types";

type Props = {
  todo: Todo;
  categories: Category[];
  onToggle: (todo: Todo) => Promise<void>;
  onSave: (todo: Todo, input: TodoInput) => Promise<void>;
  onDelete: (todo: Todo) => Promise<void>;
};

// Badge colours per priority: High red, Medium blue, Low gray.
const PRIORITY_STYLES = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Medium: "bg-blue-50 text-blue-700 ring-blue-200",
  Low: "bg-stone-100 text-stone-600 ring-stone-200",
};

// Today's date as "YYYY-MM-DD" in the user's own timezone, so it can be
// compared with the API's due_date strings directly.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// "2026-10-28" -> "Oct 28, 2026". We build the Date from parts because
// new Date("2026-10-28") is read as UTC and can show the previous day.
function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TodoItem({ todo, categories, onToggle, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOverdue = !todo.is_completed && todo.due_date !== null && todo.due_date < todayString();
  const categoryColor = categories.find((c) => c.id === todo.category)?.color;

  // Run an action while showing the item as "busy" so it can't be clicked twice.
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-accent/40 bg-card p-4 shadow-sm">
        <TodoForm
          categories={categories}
          initial={todo}
          submitLabel="Save"
          onSubmit={async (input) => {
            await onSave(todo, input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      className={`group flex items-start gap-3 rounded-xl border border-line bg-card p-4 transition hover:shadow-sm ${
        busy ? "opacity-60" : ""
      }`}
    >
      {/* Round checkbox that toggles is_completed */}
      <button
        type="button"
        onClick={() => run(() => onToggle(todo))}
        disabled={busy}
        aria-label={todo.is_completed ? "Mark as not done" : "Mark as done"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          todo.is_completed ? "border-accent bg-accent text-white" : "border-stone-300 hover:border-accent"
        }`}
      >
        {todo.is_completed && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium ${todo.is_completed ? "text-muted line-through" : ""}`}>{todo.title}</p>
        {todo.description && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-muted">{todo.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${PRIORITY_STYLES[todo.priority_label]}`}>
            {todo.priority_label}
          </span>
          {todo.due_date && (
            <span className={isOverdue ? "font-medium text-red-600" : "text-muted"}>
              {isOverdue ? "Overdue · " : "Due "}
              {formatDate(todo.due_date)}
            </span>
          )}
          {todo.category_name && (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor ?? "#999" }} />
              {todo.category_name}
            </span>
          )}
        </div>
      </div>

      {/* Always visible on phones; on larger screens they appear on hover. */}
      <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button type="button" onClick={() => setEditing(true)} disabled={busy} className="btn-ghost px-2 py-1 text-xs">
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${todo.title}"?`)) run(() => onDelete(todo));
          }}
          disabled={busy}
          className="btn-ghost px-2 py-1 text-xs hover:bg-red-50 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
