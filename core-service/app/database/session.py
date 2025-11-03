"""
Async database session management and dependencies.
Provides async session lifecycle management for FastAPI routes.
"""
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.connection import SessionLocal
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Create synchronous engine and session maker for sync operations
sync_engine = create_engine(
    settings.DATABASE_URL.replace('+aiosqlite', ''),  # Remove async driver
    echo=False,
    future=True,
    connect_args={"check_same_thread": False}
)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async database session dependency for FastAPI routes.
    
    Provides:
    - Automatic async session creation
    - Automatic session cleanup
    - Exception handling
    - Transaction management
    
    Usage in FastAPI routes:
    ```python
    @router.get("/items")
    async def get_items(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(Item))
        return result.scalars().all()
    ```
    
    The session is automatically:
    - Created before the route handler runs
    - Passed to the route handler
    - Closed after the route handler completes (even if error occurs)
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"Database error occurred: {str(e)}")
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db() -> Generator[Session, None, None]:
    """
    Synchronous database session dependency for FastAPI routes.
    
    Use this for routes that need synchronous database operations.
    
    Usage in FastAPI routes:
    ```python
    @router.get("/items")
    def get_items(db: Session = Depends(get_sync_db)):
        return db.query(Item).all()
    ```
    """
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database error occurred: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
