"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// The login and register pages look almost the same, so they share this form.
// `mode` decides whether the email field is shown and which API call is made.
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { status, login, register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  // Already logged in? Then this page is pointless: go to the todo list.
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSubmitting(true);
    setErrors({});
    try {
      if (isRegister) await register(username, email, password);
      else await login(username, password);
      // The effect above redirects once status becomes "authenticated".
    } catch (error) {
      setErrors(getFieldErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-sm font-medium tracking-wide text-accent">Todo App</p>
        <h1 className="font-serif text-5xl leading-none">{isRegister ? "Make an account" : "Welcome back"}</h1>
        <p className="mt-3 text-sm text-muted">
          {isRegister ? "A quiet place for the things you need to do." : "Log in to see your list."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <Input label="Username" value={username} onChange={setUsername} error={errors.username} autoComplete="username" />
          {isRegister && (
            <Input label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
          )}
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-accent underline-offset-4 hover:underline">
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

// A labelled input with its error message underneath.
function Input(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required
        className={`field ${props.error ? "border-red-400" : ""}`}
      />
      {props.error && <span className="mt-1 block text-xs text-red-600">{props.error}</span>}
    </label>
  );
}
