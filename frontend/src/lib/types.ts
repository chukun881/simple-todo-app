// Shapes of the JSON the Django API sends back.
// Keeping them in one place means TypeScript warns us if we use a field wrongly.

export type User = {
  id: number;
  username: string;
  email: string;
};

export type Category = {
  id: number;
  name: string;
  color: string; // "#rrggbb"
  created_at: string;
};

export type Priority = 1 | 2 | 3; // 1 = Low, 2 = Medium, 3 = High

export type Todo = {
  id: number;
  title: string;
  description: string;
  is_completed: boolean;
  priority: Priority;
  priority_label: "Low" | "Medium" | "High";
  due_date: string | null; // "YYYY-MM-DD"
  category: number | null; // category id
  category_name: string | null;
  created_at: string;
  updated_at: string;
};

// What we send when creating or editing a todo (the server fills in the rest).
export type TodoInput = {
  title: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  category: number | null;
};

// Login and register both answer with a token plus the user.
export type AuthResponse = {
  token: string;
  user: User;
};
