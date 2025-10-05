Frontend (Vite + React + TS)

Commands

- npm install — install deps
- npm run dev — start dev server on http://localhost:5173
- npm run test — run unit tests (Vitest + RTL)
- npm run build — production build

Notes

- Uses React Router for routing, React Query for server state, and Zustand for auth/cart client state.
- API client in src/api/ with axios and JWT refresh logic.
- Types for DRF responses in src/types/api.ts.
- Basic accessibility on Header, Modal, and gallery components; keyboard navigable.

