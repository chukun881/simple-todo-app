"use client";

import { useState } from "react";
import { getFieldErrors } from "@/lib/api";
import type { Category, Priority, Todo, TodoInput } from "@/lib/types";

type Props = {
  categories: Category[];
  initial?: Todo; // pass a todo to edit it; leave empty to create a new one
  submitLabel: string;
  onSubmit: (input: TodoInput) => Promise<void>; // throws ApiError on failure
  onCancel?: () => void;
};

// Used twice: for adding a new todo and for editing an existing one.
export default function TodoForm({ categories, initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 2);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [category, setCategory] = useState(initial?.category ? String(initial.category) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // The "add" form starts compact; extra fields appear once you focus it.
  const [expanded, setExpanded] = useState(Boolean(initial));

  // If the chosen category gets deleted meanwhile, fall back to "None"
  // instead of sending an id that no longer exists.
  const categoryId = categories.some((c) => String(c.id) === category) ? category : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        // The API wants null (not "") for "no date" / "no category".
        due_date: dueDate || null,
        category: categoryId ? Number(categoryId) : null,
      });
      if (!initial) {
        // Clear the "add" form so the next todo can be typed straight away.
        setTitle("");
        setDescription("");
        setPriority(2);
        setDueDate("");
      }
    } catch (error) {
      setErrors(getFieldErrors(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder={initial ? "Title" : "What needs doing?"}
          required
          maxLength={200}
          className={`field ${initial ? "" : "py-3 text-base"}`}
        />
        <FieldError message={errors.title} />
      </div>

      {expanded && (
        <>
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="field resize-y"
            />
            <FieldError message={errors.description} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-muted">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                className="field mt-1"
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
              <FieldError message={errors.priority} />
            </label>

            <label className="block text-xs font-medium text-muted">
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field mt-1" />
              <FieldError message={errors.due_date} />
            </label>

            <label className="block text-xs font-medium text-muted">
              Category
              <select value={categoryId} onChange={(e) => setCategory(e.target.value)} className="field mt-1">
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.category} />
            </label>
          </div>

          <FieldError message={errors.form} />

          <div className="flex justify-end gap-2">
            {onCancel ? (
              <button type="button" onClick={onCancel} className="btn-ghost">
                Cancel
              </button>
            ) : (
              <button type="button" onClick={() => setExpanded(false)} className="btn-ghost">
                Less
              </button>
            )}
            <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-normal text-red-600">{message}</p>;
}
