// One small wrapper around fetch() that every API call goes through.
// Doing it in one place means the base URL, JSON headers, the auth token and
// error handling are written once instead of being repeated in every component.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

// ---- Token storage -------------------------------------------------------
// We keep the token in localStorage so the user stays logged in after a page
// refresh. (Trade-off: any script on the page can read localStorage, so a
// production app might prefer an httpOnly cookie. For learning, this is the
// simplest thing that works with DRF token auth.)
const TOKEN_KEY = "todo-token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ---- Errors ----------------------------------------------------------------
// A typed error so callers can check `error.status` (e.g. 400) and read the
// parsed JSON body (e.g. {"password": ["Too short"]}).
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

// The auth provider registers a function here. When ANY request gets a 401
// (token missing, expired or deleted), we call it so the app can log out and
// send the user to /login. api.ts can't import the provider itself (that would
// be a circular import), so the provider "plugs in" instead.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ---- The fetch wrapper ---------------------------------------------------
type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = tokenStorage.get();
  if (token) headers.Authorization = `Token ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  // 204 No Content (delete, logout) has no body, so there is nothing to parse.
  if (response.status === 204) return undefined as T;

  // Parse JSON if there is any; some error pages may not be JSON.
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(response.status, data);
  }
  return data as T;
}

// ---- Turning errors into messages -----------------------------------------
// DRF sends validation errors as {"field": ["message", ...]}. This flattens
// them to {"field": "message"} so a form can show one line under each input.
// Errors not tied to a field (non_field_errors, detail) end up under "form".
export function getFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(error.body)) {
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      const field = key === "non_field_errors" || key === "detail" ? "form" : key;
      result[field] = message;
    }
    return result;
  }
  if (error instanceof ApiError) {
    return { form: `Something went wrong (error ${error.status}).` };
  }
  // fetch() itself throws a TypeError when the server can't be reached.
  return { form: "Can't reach the server. Is the backend running?" };
}
