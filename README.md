# Learnora

**AI-powered Learning Path Planner with Knowledge Graph Support + Dynamic Knowledge Evaluation**

An intelligent learning platform that suggests personalized content based on user goals, current knowledge level, and learning preferences. Now includes advanced adaptive testing and knowledge tracing capabilities.

> ✅ **Consolidated Version**: This is the complete, production-ready version consolidating all features from 4 development branches + Dynamic Knowledge Evaluation (DKE) system from KG_CD_DKE root folder. Verified against [GitHub repository](https://github.com/MaheeGamage/Learnora). See [DKE_INTEGRATION_STATUS.md](DKE_INTEGRATION_STATUS.md) for latest updates.

## 🌟 Features

### Backend (FastAPI + Python)
- 🎯 **Learning Path Planning**: AI-powered learning path generation using LangGraph
- 🧠 **Knowledge Graph**: RDF-based knowledge storage for user learning data
- � **Dynamic Knowledge Evaluation (NEW!)**: Adaptive testing (IRT/CAT), Bayesian knowledge tracing (BKT), multi-modal assessment
- 📈 **Learning Analytics**: Comprehensive progress tracking, mastery levels, learning gap identification
- �👤 **User Management**: Complete authentication system with FastAPI-Users
- 🎓 **Concept Management**: Track and manage learning concepts
- 🔍 **Content Discovery**: Integrated content discovery system
- 🗄️ **Database**: SQLAlchemy with SQLite/PostgreSQL support
- 🔐 **Security**: JWT authentication, secure password hashing
- 📝 **API Documentation**: Auto-generated OpenAPI/Swagger docs

### Frontend (React + TypeScript)
- ⚛️ **React 19**: Latest React with TypeScript
- 🎨 **Material-UI**: Complete MUI component library + Toolpad
- 🧭 **React Router v7**: Modern routing with data loading
- 🔒 **Authentication**: Sign-in/sign-up flows with session management
- 📱 **Responsive**: Mobile-friendly dashboard layout
- ⚡ **Fast**: Vite for lightning-fast development

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd core-service

# Install dependencies (using uv - recommended)
uv sync

# Or using pip
pip install -e .

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Run the server
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd learner-web-app

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📁 Project Structure

```
Learnora/
├── core-service/          # Backend (FastAPI)
│   ├── app/
│   │   ├── config.py      # Configuration management
│   │   ├── main.py        # FastAPI application
│   │   ├── database/      # Database models and connection
│   │   ├── features/      # Feature modules
│   │   │   ├── users/     # User authentication & management
│   │   │   ├── learning_path/  # Learning path planning
│   │   │   ├── concept/   # Concept management
│   │   │   └── content/   # Content discovery
│   │   └── kg/            # Knowledge Graph (RDF)
│   ├── tests/             # Unit tests
│   └── pyproject.toml     # Python dependencies
│
├── learner-web-app/       # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── features/      # Feature modules
│   │   │   └── auth/      # Authentication components
│   │   ├── pages/         # Page components
│   │   ├── common/        # Shared components
│   │   │   └── layouts/   # Layout components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── routes.ts      # Route configuration
│   └── package.json       # Node dependencies
│
└── README.md              # This file
```

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework
- **LangChain & LangGraph**: AI agent framework
- **Google Generative AI**: LLM integration
- **SQLAlchemy**: SQL toolkit and ORM
- **FastAPI-Users**: User authentication
- **RDFLib**: Knowledge graph support
- **Pydantic**: Data validation
- **aiosqlite**: Async SQLite support

### Frontend
- **React 19**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **React Router v7**: Routing
- **Material-UI (MUI)**: Component library
- **@toolpad/core**: Authentication components
- **Emotion**: CSS-in-JS styling

## 🔧 Configuration

### Backend (.env)
```env
# App Settings
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=sqlite:///./learnora.db

# Google AI
GOOGLE_API_KEY=your-google-api-key

# LangSmith (optional)
LANGSMITH_TRACING=False
LANGSMITH_API_KEY=
```

### Frontend
Configured in `vite.config.ts` and connects to backend at `http://localhost:8000`

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Main Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/jwt/login` - Login
- `GET /api/v1/learning-paths` - Get learning paths
- `POST /api/v1/learning-paths` - Create learning path
- `GET /api/v1/concepts` - Get concepts
- `GET /api/v1/user-knowledge` - Get user knowledge graph

## 🧪 Testing

### Backend Tests
```bash
cd core-service
pytest
```

### Frontend Tests
```bash
cd learner-web-app
npm run test
```

## 📝 Development

### Running Scripts
The project includes helper scripts:

```bash
# Backend
./scripts/run-core-service.sh

# Frontend
./scripts/run-learner-web-app.sh
```

### Code Style
- Backend: Follow PEP 8
- Frontend: ESLint + TypeScript strict mode

## 🚢 Deployment

### Backend
- Set `APP_ENV=production`
- Use PostgreSQL for production database
- Set secure `SECRET_KEY`
- Configure proper CORS origins

### Frontend
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

## 📖 Documentation

Additional documentation available in `/docs`:
- Authentication integration guide
- AI agent architecture
- Knowledge graph schema

## 🤝 Contributing

This is a consolidated version of multiple development branches. The most feature-rich components from each version have been integrated.

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues or questions, check the documentation in `/docs` or the API documentation at `/docs` endpoint.

---

**Built with ❤️ using FastAPI, React, and AI**
