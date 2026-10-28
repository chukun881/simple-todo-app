# Todo App frontend

Next.js (App Router) + TypeScript + Tailwind. Talks to the Django API in `../backend`.

## Run locally

```bash
cp .env.example .env.local   # points at http://127.0.0.1:8000/api
npm install
npm run dev                  # http://localhost:3000
```

The backend must be running (`python manage.py runserver` in `backend/`) and allow
`http://localhost:3000` in `CORS_ALLOWED_ORIGINS` (the default).

## Where things live

- `src/lib/api.ts` – fetch wrapper (base URL, token header, errors)
- `src/lib/auth.tsx` – login state, token in localStorage
- `src/lib/types.ts` – TypeScript shapes of the API's JSON
- `src/app/` – pages: `/` (todo list), `/login`, `/register`
- `src/components/` – forms, todo row, category sidebar
