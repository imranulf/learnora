# Learnora - Features Documentation

## 🎯 Core Features

### 1. AI-Powered Learning Path Planning

**Description**: Generate personalized learning paths using AI agents powered by LangGraph and Google Generative AI.

**Capabilities**:
- Analyze user's current knowledge level
- Create step-by-step learning roadmaps
- Suggest appropriate learning resources
- Adapt to user's learning pace and preferences
- Consider time availability and learning goals

**Technical Implementation**:
- LangGraph-based AI agent workflow
- Google Gemini integration for content generation
- State management for learning progression
- Async processing for better performance

**API Endpoints**:
```
GET  /api/v1/learning-paths         - List all learning paths
POST /api/v1/learning-paths         - Create new learning path
GET  /api/v1/learning-paths/{id}    - Get specific learning path
PUT  /api/v1/learning-paths/{id}    - Update learning path
DELETE /api/v1/learning-paths/{id}  - Delete learning path
```

---

### 2. Knowledge Graph (RDF-based)

**Description**: Store and manage learning data using semantic web technologies (RDF) for rich knowledge representation.

**Capabilities**:
- Represent complex relationships between concepts
- Track user's learning progress semantically
- Enable advanced queries using SPARQL
- Export/import knowledge in RDF formats (Turtle, RDF/XML)
- Link learning concepts with prerequisites and dependencies

**Technical Implementation**:
- RDFLib for RDF graph management
- Custom ontologies for different domains:
  - User Knowledge Ontology
  - Learning Path Ontology
  - Concept Ontology
- File-based persistence (Turtle format)
- Async storage operations

**Storage Structure**:
```
data/graph/
├── ontologies/              # Ontology definitions
│   ├── user_knowledge.ttl
│   ├── learning_path.ttl
│   └── concept.ttl
└── [user-specific].ttl      # User knowledge graphs
```

**API Endpoints**:
```
GET  /api/v1/user-knowledge              - Get user's knowledge graph
POST /api/v1/user-knowledge              - Add knowledge entry
GET  /api/v1/user-knowledge/export       - Export as RDF
POST /api/v1/user-knowledge/import       - Import from RDF
```

---

### 3. User Authentication & Management

**Description**: Complete authentication system with JWT tokens and user management.

**Capabilities**:
- User registration with email validation
- Secure login with JWT tokens
- Password reset functionality
- User profile management
- Role-based access control (ready for future implementation)

**Technical Implementation**:
- FastAPI-Users library
- JWT token authentication
- Bcrypt password hashing
- SQLAlchemy user models
- Async database operations

**API Endpoints**:
```
POST /api/v1/auth/register           - Register new user
POST /api/v1/auth/jwt/login          - Login (get JWT token)
POST /api/v1/auth/jwt/logout         - Logout
GET  /api/v1/users/me                - Get current user
PATCH /api/v1/users/me               - Update current user
```

---

### 4. Concept Management

**Description**: Organize and manage learning concepts with relationships and metadata.

**Capabilities**:
- Create and organize learning concepts
- Define concept prerequisites
- Track concept difficulty levels
- Link concepts to learning resources
- Store concept relationships in Knowledge Graph

**Technical Implementation**:
- RESTful API for CRUD operations
- RDF-based concept storage
- Relationship tracking (prerequisite, related, part-of)
- Integration with learning paths

**API Endpoints**:
```
GET  /api/v1/concepts              - List all concepts
POST /api/v1/concepts              - Create new concept
GET  /api/v1/concepts/{id}         - Get specific concept
PUT  /api/v1/concepts/{id}         - Update concept
DELETE /api/v1/concepts/{id}       - Delete concept
GET  /api/v1/concepts/{id}/related - Get related concepts
```

---

### 5. Content Discovery System

**Description**: Integrated content discovery system for finding learning resources.

**Capabilities**:
- Multiple search strategies (BM25, Dense, Hybrid)
- Natural language query processing
- Web crawling for content indexing
- Personalized content recommendations
- Multi-format content support (text, video, audio, etc.)

**Technical Implementation**:
- Pure Python implementation (no external dependencies for core features)
- In-memory vector database
- NLP processing with synonym expansion
- BM25 and TF-IDF algorithms
- Knowledge-based ranking

**Integration Points**:
- Integrated with learning path generation
- Used for resource recommendations
- Supports user preference learning

---

### 6. Modern React Frontend

**Description**: Responsive web application built with React 19 and Material-UI.

**Capabilities**:
- Modern, responsive UI design
- Dashboard with sidebar navigation
- Authentication flows (sign-in, sign-up)
- Protected routes and session management
- Real-time updates
- Mobile-friendly responsive design

**Technical Implementation**:
- React 19 with TypeScript
- Material-UI (MUI) component library
- React Router v7 for routing
- @toolpad/core for authentication UI
- Vite for fast development
- Context API for state management

**Key Pages**:
```
/                  - Dashboard home
/sign-in           - Authentication page
/learning-paths    - Learning paths management (planned)
/concepts          - Concepts browser (planned)
/knowledge-graph   - Visual KG explorer (planned)
```

---

## 🔮 Planned Features (Roadmap)

### Phase 1 (Next Release)
- [ ] Visual Knowledge Graph Explorer
- [ ] Learning progress tracking dashboard
- [ ] Concept browser with search and filter
- [ ] Learning path templates
- [ ] Content recommendations widget

### Phase 2
- [ ] Collaborative learning paths
- [ ] Social features (share progress, achievements)
- [ ] Gamification (badges, points, streaks)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard

### Phase 3
- [ ] Integration with external content providers (YouTube, Coursera, etc.)
- [ ] Multi-language support
- [ ] Voice-based learning assistant
- [ ] AR/VR learning experiences
- [ ] Offline mode support

---

## 🧩 Feature Integration

### How Features Work Together

1. **User Journey**:
   ```
   User Signs Up → Creates Learning Goal → AI Generates Learning Path → 
   System Discovers Content → User Learns → Progress Tracked in KG → 
   AI Adapts Recommendations
   ```

2. **Data Flow**:
   ```
   Frontend (React) ←→ Backend API (FastAPI) ←→ Database (SQLite/PostgreSQL)
                                              ↓
                                        Knowledge Graph (RDF)
   ```

3. **AI Pipeline**:
   ```
   User Input → NLP Processing → Intent Detection → LangGraph Agent → 
   Google AI → Content Discovery → Personalization → Response
   ```

---

## 📊 Feature Matrix

| Feature | Status | Backend | Frontend | Tests | Docs |
|---------|--------|---------|----------|-------|------|
| Learning Path Planning | ✅ Complete | ✅ | 🚧 Partial | ✅ | ✅ |
| Knowledge Graph (RDF) | ✅ Complete | ✅ | ❌ Planned | ✅ | ✅ |
| User Authentication | ✅ Complete | ✅ | ✅ | ✅ | ✅ |
| Concept Management | ✅ Complete | ✅ | ❌ Planned | ✅ | ✅ |
| Content Discovery | ✅ Complete | ✅ | ❌ Planned | ✅ | ✅ |
| Dashboard UI | 🚧 Partial | N/A | 🚧 | ❌ | 🚧 |
| Visual KG Explorer | ❌ Planned | ❌ | ❌ | ❌ | ❌ |
| Progress Tracking | ❌ Planned | ❌ | ❌ | ❌ | ❌ |

Legend:
- ✅ Complete
- 🚧 In Progress / Partial
- ❌ Planned / Not Started
- N/A - Not Applicable

---

## 🔧 Configuration Options

Each feature can be configured via environment variables. See `.env.example` for details.

**Key Configurations**:
- `GOOGLE_API_KEY` - Required for AI features
- `DATABASE_URL` - Database connection
- `LANGSMITH_TRACING` - Enable AI debugging
- `KG_DATA_DIR` - Knowledge Graph storage location
- `CORS_ORIGINS` - Frontend URL for API access

---

## 📖 Usage Examples

See individual feature documentation in `/docs/ai_agent/` for detailed examples and API usage.

For quick start guide, see [QUICKSTART.md](../QUICKSTART.md)
