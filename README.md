# Learnora

An AI-powered casual learning platform that creates personalized learning paths using knowledge graphs, LLM-driven conversation, and adaptive assessments.

## Features

- **AI Learning Path Planning** — A conversational agent guides you through defining learning goals and generates a structured concept graph with prerequisites
- **Knowledge Graph Visualization** — Interactive graph view of concepts and their relationships, with progress-based color coding
- **Adaptive Assessments** — AI-generated quizzes using IRT (Item Response Theory) and BKT (Bayesian Knowledge Tracing) to track mastery
- **Content Discovery** — Search and crawl external learning resources (YouTube, web, Medium) with hybrid search (BM25 + Dense)
- **Personalized Content** — AI-powered difficulty adaptation, summaries, key takeaways, and time estimates
- **Progress Tracking** — Dashboard with analytics, completion metrics, and per-concept mastery levels
- **Dark Mode** — Full dark/light theme support across the application

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Async Python web framework |
| **LangChain / LangGraph** | LLM orchestration, multi-turn state machines |
| **Google Gemini** | Primary LLM (`gemini-2.5-flash-lite` for agent, `gemini-2.5-flash` for content) |
| **RDFlib** | Knowledge graph storage (Turtle .ttl files) |
| **SQLAlchemy** (async) | Relational database ORM (SQLite in dev) |
| **fastapi-users** | JWT-based authentication |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** + **TypeScript** | UI framework |
| **Vite** | Build tool |
| **Material UI (MUI)** | Component library |
| **React Query** | Server state management with caching |
| **React Router 7** | Client-side routing |
| **vis-network** | Knowledge graph visualization |
| **Framer Motion** | Animations |

## Project Structure

```
learnora/
├── core-service/                # Backend API
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Environment settings (pydantic-settings)
│   │   ├── database/            # SQLAlchemy async + sync session setup
│   │   ├── kg/                  # Knowledge graph ontologies
│   │   └── features/
│   │       ├── agent/           # AI chat & learning path graph (LangGraph)
│   │       ├── learning_path/   # Learning path CRUD, progress, KG integration
│   │       ├── concept/         # Concept management & explanations
│   │       ├── assessment/      # Quiz generation (IRT + BKT) & evaluation
│   │       ├── content_discovery/    # External content search & crawling
│   │       ├── content_personalization/  # AI-powered content adaptation
│   │       ├── knowledge_graph/ # RDFlib graph operations
│   │       ├── users/           # Authentication & preferences
│   │       └── dashboard/       # Analytics & metrics
│   ├── data/
│   │   └── graph/instances/     # KG data files (.ttl)
│   └── pyproject.toml
│
├── learner-web-app/             # Frontend SPA
│   ├── src/
│   │   ├── root.tsx             # Root layout
│   │   ├── routes.ts            # Route definitions
│   │   ├── pages/               # Route pages (home, learn, practice, discover)
│   │   ├── features/            # Feature components
│   │   │   ├── agent/           # Floating chat, connected chat window
│   │   │   ├── learning-path/   # Path viewer, progress, quiz dialog
│   │   │   ├── assessment/      # Quiz player, results, assessment panel
│   │   │   └── content-discovery/  # Content cards, search
│   │   ├── services/            # API client & service modules
│   │   ├── hooks/               # React Query hooks, chat context
│   │   └── contexts/            # Auth & theme contexts
│   └── package.json
│
└── scripts/                     # Utility scripts
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Backend Setup

```bash
cd core-service

# Option 1: Using uv (recommended)
uv sync

# Option 2: Using pip
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -e .

# Configure environment
cp .env.example .env
# Edit .env — at minimum set GOOGLE_API_KEY and SECRET_KEY

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd learner-web-app

# Install dependencies
npm install

# Configure environment
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Run development server
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:8000`.

## Environment Variables

### Backend (`core-service/.env`)

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `SECRET_KEY` | Yes | JWT signing secret |
| `DATABASE_URL` | No | SQLAlchemy async URL (defaults to SQLite) |
| `YOUTUBE_API_KEY` | No | YouTube Data API key for content discovery |
| `PERPLEXITY_API_KEY` | No | Perplexity API for AI-enhanced search |

### Frontend (`learner-web-app/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend API URL (default: `http://localhost:8000`) |

## How It Works

### Learning Path Creation

```
User starts chat (LPP mode)
    │
    ▼
AI asks clarifying questions ──► User provides learning goal
    │
    ▼
Intention evaluated ──► Follow-up if unclear (max 1)
    │
    ▼
Learning goal formally defined (competencies + success criteria)
    │
    ▼
Concept graph generated (concepts + prerequisites)
    │
    ▼
Saved to DB + Knowledge Graph (.ttl files)
    │
    ▼
Interactive graph visualization with progress tracking
```

### Assessment & Mastery

1. Select a concept from the knowledge graph (prerequisites must be mastered first)
2. AI generates quiz questions tailored to the concept
3. Responses evaluated using IRT (difficulty estimation) and BKT (knowledge tracing)
4. Mastery level updates automatically (threshold: 0.7 = mastered)
5. Graph nodes change color to reflect progress

### Architecture

```
User ──► React Frontend ──► FastAPI Backend ──► Gemini LLM
              │                    │
              │                    ├──► SQLite (paths, users, progress, knowledge state)
              │                    └──► RDFlib/TTL (concept graphs, relationships)
              │
              └── vis-network (interactive graph visualization)
```

## API Documentation

With the backend running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

All endpoints are prefixed with `/api/v1`.

## Notes

- **Gemini free tier** allows ~20 requests/day per model. The app handles rate limits gracefully with clear error messages.
- Knowledge graph data is stored as `.ttl` (Turtle) files — no external graph database required.
- Content discovery uses an in-memory vector store; indexed content is lost on server restart.

## License

This project is part of a Knowledge Graph & Computational Design Knowledge Engineering research project at TU Darmstadt.
