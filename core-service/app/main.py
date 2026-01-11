from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import logging

# Load environment variables from .env file BEFORE importing modules that need them
load_dotenv()

from app.config import settings
from app.features.learning_path.router import router as learning_path_router
from app.features.learning_path.progress_router import router as learning_path_progress_router
from app.features.concept.router import router as concept_router
from app.features.users.knowledge.router import router as user_knowledge_router
from app.features.users.router import router as users_router
from app.features.users.preference_router import router as preferences_router
from app.features.assessment.router import router as assessment_router
from app.features.content_discovery.router import router as content_discovery_router
from app.features.content_personalization.router import router as content_personalization_router
from app.features.knowledge_graph.router import router as knowledge_graph_router
from app.features.dashboard.router import router as dashboard_router
from app.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Async lifespan context manager for startup/shutdown"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.APP_ENV}")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down application")


# Initialize FastAPI app with async lifespan
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered learning path planner",
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Configure CORS middleware with security-conscious defaults
# In production, restrict origins, methods, and headers
if settings.APP_ENV == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,  # Should be set to specific domains
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        max_age=3600,  # Cache preflight for 1 hour
    )
else:
    # Development mode - more permissive but logged
    logger.warning("Running in development mode with permissive CORS settings")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register routers
app.include_router(
    learning_path_router,
    prefix=f"{settings.API_V1_PREFIX}/learning-paths",
    tags=["learning-paths"]
)

# Register learning path progress router (Priority 3 - Nov 3, 2025)
app.include_router(
    learning_path_progress_router,
    prefix=f"{settings.API_V1_PREFIX}/learning-paths",
    tags=["learning-path-progress"]
)

app.include_router(
    concept_router,
    prefix=f"{settings.API_V1_PREFIX}/concepts",
    tags=["concepts"]
)

app.include_router(
    user_knowledge_router,
    prefix=f"{settings.API_V1_PREFIX}/user-knowledge",
    tags=["user-knowledge"]
)

# Register user/auth router
app.include_router(
    users_router,
    prefix=settings.API_V1_PREFIX,
)

# Register user preferences router
app.include_router(
    preferences_router,
    prefix=settings.API_V1_PREFIX,
    tags=["preferences"]
)

# Register assessment router
app.include_router(
    assessment_router,
    prefix=settings.API_V1_PREFIX,
    tags=["assessment"]
)

# Register content discovery router
app.include_router(
    content_discovery_router,
    prefix=settings.API_V1_PREFIX,
    tags=["content-discovery"]
)

# Register content personalization router
app.include_router(
    content_personalization_router,
    prefix=settings.API_V1_PREFIX,
    tags=["content-personalization"]
)

# Register knowledge graph router
app.include_router(
    knowledge_graph_router,
    prefix=settings.API_V1_PREFIX,
    tags=["knowledge-graph"]
)

# Register dashboard router
app.include_router(
    dashboard_router,
    prefix=settings.API_V1_PREFIX,
    tags=["dashboard"]
)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "version": settings.VERSION
    }