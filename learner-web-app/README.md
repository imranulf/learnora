# Learnora - Frontend

React 19 + TypeScript + Vite frontend for the Learnora learning platform.

## Setup

```bash
npm install
npm run dev       # Development server (http://localhost:5173)
npm run build     # Production build
npm run lint      # ESLint
```

## Environment

Create `.env` in this directory:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Structure

```
src/
├── pages/              # Route pages (home, learn, practice, discover, profile)
├── features/
│   ├── agent/          # AI chat (FloatingChat, ChatWindow)
│   ├── learning-path/  # KG viewer, progress, quiz dialog
│   ├── assessment/     # Quiz player, results, assessment panel
│   ├── content-discovery/ # Content search & cards
│   └── auth/           # Sign in/up forms
├── services/           # API client & typed service modules
├── hooks/              # React Query hooks, chat context, session
├── contexts/           # SessionContext, ChatContext
└── common/             # Shared layouts, providers, components
```

## Key Libraries

- **Material UI** — Component library with dark mode
- **React Query** — Server state with caching & invalidation
- **React Router 7** — File-based routing via `routes.ts`
- **vis-network** — Knowledge graph visualization
- **Framer Motion** — Animations (floating chat icon)
