"use client";

import { useState } from "react";
import { getFieldErrors } from "@/lib/api";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  selectedId: number | null; // the category currently used as a filter
  onSelect: (id: number | null) => void;
  onCreate: (name: string, color: string) => Promise<void>; // throws ApiError on failure
  onDelete: (category: Category) => Promise<void>;
};

// A few ready-made colours so picking one is a single click.
const SWATCHES = ["#2f5d50", "#c2410c", "#b45309", "#4d7c0f", "#0e7490", "#4338ca", "#a21caf", "#57534e"];

// Sidebar list of categories: click one to filter, add new ones, delete old ones.
export default function CategoryManager({ categories, selectedId, onSelect, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await onCreate(name.trim(), color);
      setName("");
    } catch (error) {
      setErrors(getFieldErrors(error)); // e.g. {"name": "You already have a category with this name."}
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Categories</h2>

      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
              selectedId === null ? "bg-accent-soft font-medium text-accent" : "hover:bg-line/60"
            }`}
          >
            All categories
          </button>
        </li>
        {categories.map((category) => (
          <li key={category.id} className="group flex items-center">
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition ${
                selectedId === category.id ? "bg-accent-soft font-medium text-accent" : "hover:bg-line/60"
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="truncate">{category.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete category "${category.name}"? Its todos are kept.`)) onDelete(category);
              }}
              aria-label={`Delete category ${category.name}`}
              className="ml-1 rounded-md px-2 py-1 text-muted transition hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="mt-4 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category"
          maxLength={50}
          required
          className="field"
        />
        <div className="flex items-center gap-1.5">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Colour ${swatch}`}
              className={`h-5 w-5 rounded-full transition ${
                color === swatch ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "hover:scale-110"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
          {/* Native colour picker for any other colour */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Custom colour"
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </div>
        {(errors.name || errors.color || errors.form) && (
          <p className="text-xs text-red-600">{errors.name || errors.color || errors.form}</p>
        )}
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full py-1.5">
          {saving ? "Adding..." : "Add category"}
        </button>
      </form>
    </section>
  );
}
