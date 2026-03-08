# CLAUDE.md - Learnora v1

## Quick Reference Commands

### Backend (core-service)
```bash
cd core-service

# Setup (uses uv package manager + pyproject.toml)
uv sync
# Or with pip:
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e .

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Environment
cp .env.example .env  # Configure API keys
```

### Frontend (learner-web-app)
```bash
cd learner-web-app

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Architecture Overview

### Backend: FastAPI + LangChain + Knowledge Graphs

**Tech Stack:**
- FastAPI with async SQLAlchemy (SQLite in dev)
- LangChain/LangGraph for AI orchestration
- RDFlib + Turtle (.ttl) for knowledge graph storage (file-based)
- Google Gemini as LLM (gemini-2.5-flash-lite for agent, gemini-2.5-flash for learning path/MCQ/content personalization)

**Directory Structure:**
```
core-service/
├── app/
│   ├── main.py              # FastAPI app entry, router registration
│   ├── config.py            # Settings via pydantic-settings
│   ├── database/            # SQLAlchemy async setup
│   ├── kg/                  # Knowledge graph storage, ontologies
│   └── features/            # Feature modules (see below)
├── data/
│   └── graph/
│       └── instances/
│           ├── concepts.ttl      # Global concepts store
│           └── users/            # Per-user KG files (user_N.ttl)
```

**Feature Modules** (each contains router.py, service.py, schemas.py, crud.py, models.py):
- `learning_path/` - Learning path CRUD, progress tracking, KG integration
- `concept/` - Concept management and explanations
- `assessment/` - Quiz generation (IRT + BKT) and evaluation
- `content_discovery/` - External content search (YouTube, web)
- `content_personalization/` - Personalized content recommendations
- `knowledge_graph/` - KG graph operations
- `users/` - Authentication (fastapi-users), preferences
- `dashboard/` - Analytics and metrics
- `agent/` - LangGraph-based AI chat and learning path generation

**API Prefix:** `/api/v1`

### Frontend: React 19 + TypeScript + Vite

**Tech Stack:**
- React 19 with TypeScript
- Vite for bundling
- Material-UI (MUI) for components
- React Router 7 for routing (file-based via `routes.ts`)
- vis-network for knowledge graph visualization
- framer-motion for animations

**Directory Structure:**
```
learner-web-app/
├── src/
│   ├── entry.client.tsx     # Client hydration entry point
│   ├── root.tsx             # Root layout with AppProviderWrapper
│   ├── routes.ts            # React Router 7 route definitions
│   ├── pages/               # Route pages (home, learn, discover, etc.)
│   ├── features/            # Feature components
│   │   ├── agent/           # FloatingChat, ConnectedChatWindow
│   │   ├── learning-path/   # LearningPathViewer, ConceptQuizDialog
│   │   ├── assessment/      # QuizPlayer, QuizResults, AssessmentPanel
│   │   ├── auth/            # SignInForm, SignUpForm (MUI sx styling, no CSS files)
│   │   └── content-discovery/
│   ├── common/
│   │   ├── components/      # Shared components (DarkModeToggle)
│   │   ├── layouts/         # Dashboard layout wrapper
│   │   └── providers/       # AppProviderWrapper
│   ├── services/            # API service modules
│   ├── contexts/            # React contexts (Chat, Session)
│   └── hooks/               # Custom hooks (useSession, useChatContext)
```

**Key Pages:**
- `/` - Home page
- `/sign-in`, `/sign-up` - Authentication
- `/learn` - Learning paths list
- `/learning-path` - Knowledge graph viewer (with `?thread=` param)
- `/practice` - Practice/assessment page
- `/discover` - Content discovery
- `/profile` - User profile
- `/content-discovery`, `/assessment`, `/knowledge-graph` - Legacy routes

## Key Patterns

### Frontend API Architecture
- **Centralized fetch client**: `services/apiClient.ts` — typed `fetchAPI<T>()` wrapper with automatic token injection from localStorage, 401→redirect, FastAPI error extraction
- **Axios client**: `api/baseClient.ts` — used only by agent feature, also has 401 interceptor
- **Assessment API**: `features/assessment/api.ts` — imports from centralized `apiClient.ts`
- **React Query**: `hooks/useApiQueries.ts` — `useDashboardStats`, `useLearningPaths`, `usePathProgress`, `useDeleteLearningPath` hooks with caching/invalidation
- **QueryClientProvider** configured in `AppProviderWrapper.tsx` (staleTime: 60s, retry: 1)

### Authentication
- Backend: fastapi-users with JWT tokens
- Frontend: SessionContext provides session/token via `useSession()` hook
- All API calls require `Authorization: Bearer ${token}` header (auto-injected by `fetchAPI`)
- 401 responses trigger token clear + redirect to `/sign-in?callbackUrl=...` (both fetch and axios clients)

### Database Operations
- All DB operations are async using `AsyncSession`
- Sync operations (PreferenceService) use `SyncSessionLocal` from `database/session.py`
- CRUD functions in each feature's `crud.py`
- Foreign key constraints require proper commit ordering (e.g., delete child records before parent)

### AI/LLM Integration
- LangGraph state machine in `core-service/app/features/agent/learning_path_graph/`
- Two modes: LPP (Learning Path Planning) and BASIC (general chat)
- **BASIC flow**: `basic_chat → basic_wait (interrupt) → basic_chat` — multi-turn loop, never terminates
- **LPP flow**: `ask_initial → evaluate_intention → followup/format → define_goal → generate_concepts → END`
- Evaluator uses strict criteria: requires action verb + specific output (not just "learn X")
- MAX_FOLLOW_UPS = 1 (asks one clarifying question before proceeding)
- MemorySaver checkpointer for conversation state persistence
- Agent model: `gemini-2.5-flash-lite` via `init_chat_model()`
- **Rate limit handling**: Service detects Gemini 429/quota errors → raises `ValueError` → router returns HTTP 429 with clear message
- **Free tier limit**: 20 requests/day per model — resets at midnight Pacific time

### Knowledge Graph
- RDFlib stores concept relationships in Turtle (.ttl) files
- Per-user graphs in `data/graph/instances/users/user_N.ttl`
- Global concepts in `data/graph/instances/concepts.ttl`
- `parse_and_store_concepts()` in `learning_path/utils.py` — fault-tolerant, creates concepts individually
- Visualized with vis-network on frontend (hierarchical layout)

### Knowledge Graph Visualization (LearningPathViewer)
- vis-network with hierarchical layout (LR/UD toggle)
- Node color coding (5 legend items):
  - **Start nodes** (no prerequisites): Teal `#0d9488` with `▶` prefix
  - **Final/leaf nodes** (not a prerequisite of anything): Purple `#8b5cf6`
  - **Goal node** (virtual): Amber/Gold `#d97706` with `🏆` icon
  - **In Progress**: Orange `#f59e0b` (mastery > 0, not yet mastered)
  - **Mastered**: Emerald `#10b981` (mastery ≥ 0.7)
  - Not-started nodes use default blue `#667eea` (no separate legend entry)
- Floating node detail panel (absolute positioned, doesn't take graph space)
- Progress badge as floating chip overlay
- Auto-fit after physics stabilization
- Quiz completion → syncProgressWithKG → graph reload → node colors update

### Floating Chat (FloatingChat)
- Gemini-style animated sparkle icon (framer-motion SVG animations)
- Mode selection screen: LPP or Basic chat
- Chat stays open after learning path creation (user closes manually)
- Auto-navigates to learning path viewer after creation (2s delay)
- **BASIC mode graph**: `basic_chat → basic_wait (interrupt) → basic_chat` loop — supports multi-turn conversation
- **LPP mode graph**: `ask_initial → evaluate → followup/format → define_goal → generate_concepts → END`
- Error handling: mutation errors displayed as Alert in chat window

### Progress & Mastery Tracking
- `LearningPathProgress` table: per-concept mastery_level (0.0-1.0) and status (not_started, in_progress, mastered)
- Quiz system updates `KnowledgeState` via IRT (Item Response Theory) + BKT (Bayesian Knowledge Tracing)
- `_get_concept_mastery_from_kg()` queries `KnowledgeState` DB directly (async SQLAlchemy), normalizing concept name (Title Case → snake_case) to match skill column
- `syncProgressWithKG` API syncs quiz results from KnowledgeState → LearningPathProgress
- **Sync triggers:**
  1. On graph load: `loadGraphData()` always calls `syncProgressWithKG` before rendering nodes
  2. After quiz: `ConceptQuizDialog.handleQuizComplete()` syncs then calls `onQuizComplete` to reload graph
- Auto-initializes progress records when graph first loads (if none exist)
- Mastery threshold: ≥0.7 = mastered, >0.0 = in_progress

### Content Discovery & Search
- In-memory `VectorDBManager` — no persistent storage; content lost on server restart
- **Search modes** (all return consistent rankings):
  - **BM25**: Keyword-based (term frequency + IDF), highest absolute scores
  - **Dense**: TF-IDF cosine similarity (not neural embeddings), normalized 0-1 scores
  - **Hybrid**: Weighted combination (35% BM25 + 65% Dense)
- **NLP processing**: Query expansion (synonyms), intent detection, entity extraction (topics, difficulty, formats)
- **Auto-discovery**: Fetches content from YouTube (API), Medium (RSS), GitHub/Web (DuckDuckGo)
- **Content sources require API keys**: `YOUTUBE_API_KEY` (optional), `PERPLEXITY_API_KEY` (optional AI enhancement)
- Web crawler has SSRF protection (blocks private IPs, localhost, cloud metadata)

### Content Personalization (AI-powered)
- Model: `gemini-2.5-flash` via `ChatGoogleGenerativeAI`
- **Features per search result** (when `personalize: true`):
  - `personalized_summary` — Level-adapted summary (beginner/intermediate/advanced/expert)
  - `tldr` — 1-2 sentence ultra-concise summary
  - `key_takeaways` — 3-5 key learning points
  - `highlights` — Video key moments with timestamps (video/tutorial content only)
  - `estimated_time` — Level-adjusted duration (beginner 1.5x, expert 0.6x)
- Router converts content dicts → `LearningContent` dataclass before calling personalization service
- Errors are caught per-result (one failure doesn't block other results)

### Quiz Prerequisite Gating
- "Take Assessment" button is **disabled** when prerequisites aren't mastered
- Tooltip shows which prerequisites still need completion
- Start nodes (no prerequisites) can always be assessed
- Uses `getMasteryLevel()` to check each prerequisite's status

## Environment Variables

### Backend (.env)
```
GOOGLE_API_KEY=          # Required for Gemini LLM
DATABASE_URL=            # SQLAlchemy async URL
SECRET_KEY=              # JWT secret
```

**Important:** pydantic-settings loads `.env` into Settings object but does NOT set `os.environ`. The bridge in `learning_path_graph.py` handles this:
```python
if settings.GOOGLE_API_KEY and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
```

### Dark Mode Support
- MUI theme handles light/dark via Toolpad's `ReactRouterAppProvider`
- `DarkModeSync` component in `AppProviderWrapper` syncs MUI mode with Tailwind `dark` class on `<html>`
- **Pattern for theme-aware backgrounds**: Use `variant="outlined"` on Paper instead of hardcoded `bgcolor: 'grey.50'`
- Gradient banners (hero sections) use hardcoded colors — intentional, works in both modes
- White buttons on gradient backgrounds (`bgcolor: 'white'`) — intentional contrast
- `index.css` is minimal (Tailwind directives + body reset + font rendering only) — all theming delegated to MUI

### CSS Architecture
- **MUI sx prop** for all component styling (no CSS modules, no styled-components)
- **Tailwind** configured with `darkMode: 'class'` — used sparingly alongside MUI
- **No global element styles** — removed Vite defaults (button, link, :root color overrides) that conflicted with MUI
- Dead CSS files removed: `AuthForm.css` (was never imported), `App.css` only used by catchall page

## Common Issues

1. **Port 8000 already in use**: Kill existing process or use different port
2. **405 Method Not Allowed**: Ensure server is running latest code (restart uvicorn)
3. **FK constraint errors on delete**: Commit child record deletions before parent
4. **CORS errors**: Check CORS_ORIGINS in backend config
5. **Gemini API key not working**: Restart server after `.env` changes (`--reload` only watches code files, not `.env`)
6. **KG not showing after path creation**: Check `parse_and_store_concepts` logs — each concept/prerequisite is created individually with fault tolerance
7. **Chat routing to wrong mode**: Ensure FloatingChat mode selection is shown (not auto-resumed). Mode must be set before starting chat.
8. **LPP generates graph too fast (no validation)**: Evaluator prompt must use strict criteria — reject "learn X" as unclear, require action + output
9. **Dark mode readability**: Never use `bgcolor: 'grey.50'` or `bgcolor: 'grey.100'` directly — use `variant="outlined"` on Paper or theme callback `(theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'`
10. **Login page half-screen gradient**: Caused by global `display: flex` + `place-items: center` on body — removed in index.css cleanup
11. **Unused `db` parameter in routes**: Routes that only use in-memory services (content_discovery, knowledge_graph, content_personalization) should NOT inject `AsyncSession` — it creates unnecessary DB connections
12. **Sync session in async context**: Never `create_engine()` inside a route handler — use `SyncSessionLocal` from `database/session.py` instead
13. **Chat 500 error**: Usually Gemini API rate limit (free tier: 20 req/day). Check server logs for `ResourceExhausted` or `429`. Service now returns HTTP 429 with descriptive message instead of generic 500
14. **Chat exits after one message**: BASIC mode graph must loop (`basic_chat → basic_wait → basic_chat`). If it goes to `END`, the graph terminates and can't accept follow-up messages
