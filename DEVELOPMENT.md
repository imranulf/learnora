# Development Guide

## 🛠️ Development Environment Setup

### Required Tools
- **Python**: 3.12 or higher ([Download](https://www.python.org/downloads/))
- **Node.js**: 18 or higher ([Download](https://nodejs.org/))
- **Git**: Latest version ([Download](https://git-scm.com/))
- **VS Code** (recommended): Latest version ([Download](https://code.visualstudio.com/))

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 🚀 Getting Started

### 1. Clone Repository
```bash
git clone <repository-url>
cd Learnora
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd core-service

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -e .

# For development with testing
pip install -e ".[dev]"
```

#### Environment Configuration
```bash
# Copy example
cp .env.example .env

# Edit .env and set:
# - GOOGLE_API_KEY (required for AI features)
# - SECRET_KEY (generate with: openssl rand -hex 32)
```

#### Initialize Database
```bash
# The database will auto-initialize on first run
# Or manually:
python -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd learner-web-app
npm install
```

#### Environment Configuration
```bash
# Copy example
cp .env.example .env

# Default values should work for local development
```

---

## 🏃 Running the Application

### Option 1: PowerShell Scripts (Windows)
```powershell
# Start both services
cd scripts
.\start-all.ps1

# Or individually
.\run-backend.ps1
.\run-frontend.ps1
```

### Option 2: Bash Scripts (Linux/macOS)
```bash
cd scripts

# Backend
./run-core-service.sh

# Frontend
./run-learner-web-app.sh
```

### Option 3: Manual
```bash
# Terminal 1 - Backend
cd core-service
.venv\Scripts\activate  # or source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd learner-web-app
npm run dev
```

---

## 🧪 Testing

### Backend Tests
```bash
cd core-service
pytest

# With coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_kg_storage.py

# Run with verbose output
pytest -v
```

### Frontend Tests
```bash
cd learner-web-app
npm run test

# With coverage
npm run test -- --coverage
```

---

## 📁 Project Structure

### Backend (`core-service/`)
```
app/
├── config.py           # Configuration management
├── main.py             # FastAPI app entry point
├── database/           # Database layer
│   ├── base.py         # SQLAlchemy base
│   ├── connection.py   # DB connection
│   └── session.py      # Session management
├── features/           # Feature modules
│   ├── users/          # User management & auth
│   ├── learning_path/  # Learning path planning
│   ├── concept/        # Concept management
│   └── users/knowledge/# User knowledge tracking
└── kg/                 # Knowledge Graph
    ├── base.py         # RDF base classes
    ├── storage.py      # Graph storage
    ├── config.py       # KG configuration
    └── ontologies/     # RDF ontologies
```

### Frontend (`learner-web-app/`)
```
src/
├── App.tsx             # Main app component
├── routes.ts           # Route configuration
├── features/           # Feature modules
│   └── auth/           # Authentication
├── pages/              # Page components
├── common/             # Shared components
│   ├── layouts/        # Layout components
│   └── providers/      # React providers
├── contexts/           # React contexts
├── hooks/              # Custom hooks
└── services/           # API services
```

---

## 🔧 Development Workflow

### Adding a New Feature

#### Backend
1. Create feature folder: `app/features/my_feature/`
2. Create files:
   - `models.py` - SQLAlchemy models
   - `schemas.py` - Pydantic schemas
   - `router.py` - FastAPI routes
   - `service.py` - Business logic
   - `crud.py` - Database operations
3. Register router in `app/main.py`
4. Write tests in `tests/test_my_feature.py`
5. Add documentation

#### Frontend
1. Create feature folder: `src/features/my-feature/`
2. Create components
3. Add route in `routes.ts`
4. Create service in `services/`
5. Add types if needed
6. Write tests

### Coding Standards

#### Backend (Python)
- Follow PEP 8
- Use type hints
- Write docstrings
- Use async/await for I/O operations
- Keep functions small and focused

```python
async def get_user(user_id: int) -> User | None:
    """
    Get user by ID.
    
    Args:
        user_id: The user's ID
        
    Returns:
        User object if found, None otherwise
    """
    return await db.get(User, user_id)
```

#### Frontend (TypeScript)
- Use TypeScript strict mode
- Define proper types/interfaces
- Use functional components
- Follow React best practices
- Use hooks appropriately

```typescript
interface UserProps {
  userId: number;
}

export const UserProfile: React.FC<UserProps> = ({ userId }) => {
  // Component implementation
};
```

---

## 🗃️ Database

### Migrations
Currently using SQLAlchemy with auto-creation. For production, use Alembic:

```bash
# Install Alembic
pip install alembic

# Initialize
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

### Accessing Database
```bash
# SQLite (development)
sqlite3 learnora.db

# View tables
.tables

# Query users
SELECT * FROM user;
```

---

## 🔐 Authentication Flow

### Backend
1. User registers: `POST /api/v1/auth/register`
2. User logs in: `POST /api/v1/auth/jwt/login`
3. Receives JWT token
4. Token used in Authorization header: `Bearer <token>`

### Frontend
1. User fills sign-in form
2. `signInWithCredentials()` called
3. Token stored in session context
4. Token sent with API requests
5. Protected routes check session

---

## 🧠 Knowledge Graph

### Working with RDF
```python
from app.kg.storage import KnowledgeGraphStorage

# Initialize storage
kg = KnowledgeGraphStorage()

# Add triple
kg.add_triple(
    subject="user:123",
    predicate="knows",
    object="concept:python"
)

# Query
results = kg.query("""
    SELECT ?concept WHERE {
        user:123 knows ?concept
    }
""")

# Save to file
kg.save("user_123_knowledge.ttl")
```

---

## 🤖 AI Agent Development

### LangGraph Workflow
```python
from langgraph.graph import StateGraph
from app.features.learning_path.graph import create_learning_path_graph

# Create graph
graph = create_learning_path_graph()

# Run
result = await graph.ainvoke({
    "user_goal": "Learn Python",
    "user_level": "beginner"
})
```

---

## 📊 Monitoring

### LangSmith (Optional)
```bash
# In .env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_key
LANGSMITH_PROJECT=learnora-dev
```

### Logs
```bash
# Backend logs to console
# Check terminal running uvicorn

# Frontend logs
# Check browser console (F12)
```

---

## 🚢 Deployment

### Backend (Production)
```bash
# Use PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# Set production values
APP_ENV=production
DEBUG=False
SECRET_KEY=<secure-random-key>

# Use gunicorn with uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend (Production)
```bash
# Build
npm run build

# Serve (use nginx, vercel, netlify, etc.)
# The dist/ folder contains the production build
```

---

## 🐛 Debugging

### Backend
```python
# Add breakpoint
import pdb; pdb.set_trace()

# Or use VS Code debugger
# Create .vscode/launch.json
```

### Frontend
```typescript
// Use browser DevTools
console.log('Debug:', variable);

// Or use debugger statement
debugger;
```

---

## 📖 API Documentation

When backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: add my feature"

# Push
git push origin feature/my-feature

# Create pull request
```

### Commit Message Format
```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
refactor: refactor code
style: formatting changes
chore: maintenance tasks
```

---

## 💡 Tips & Tricks

### Backend
- Use `uvicorn --reload` for auto-restart during development
- Enable `DB_ECHO=True` to see SQL queries
- Use `LANGSMITH_TRACING=true` for AI debugging
- Check `/health` endpoint to verify backend is running

### Frontend
- Use React DevTools browser extension
- Hot Module Replacement (HMR) works automatically with Vite
- Check Network tab in DevTools for API calls
- Use `VITE_DEBUG=true` for verbose logging

### Both
- Keep dependencies up to date: `pip list --outdated`, `npm outdated`
- Use `.env.local` for local overrides (gitignored)
- Clear caches if issues: delete `__pycache__`, `node_modules`, `.vite`

---

## 🆘 Troubleshooting

### Backend won't start
1. Check Python version: `python --version` (need 3.12+)
2. Verify virtual environment is activated
3. Check if all dependencies installed: `pip list`
4. Verify `.env` file exists and has required keys
5. Check port 8000 is not in use

### Frontend won't start
1. Check Node version: `node --version` (need 18+)
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Clear Vite cache: delete `.vite` folder
4. Check port 5173 is not in use
5. Verify backend is running on port 8000

### Tests failing
1. Make sure test database is clean
2. Check test dependencies installed
3. Run tests in isolation: `pytest tests/test_specific.py -v`
4. Check for environment-specific issues

---

## 📞 Getting Help

1. Check documentation in `/docs`
2. Read error messages carefully
3. Check API documentation at `/docs` endpoint
4. Review test files for usage examples
5. Check GitHub issues (if applicable)

---

**Happy Developing! 🚀**
