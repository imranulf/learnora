"""API router for knowledge graph visualization."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Literal
from app.database import get_db
from app.features.users.users import current_active_user
from app.features.users.models import User
from .service import KnowledgeGraphService

router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])
service = KnowledgeGraphService()


# ===== Request/Response Models =====

class NodeData(BaseModel):
    """Knowledge graph node."""
    id: str
    label: str
    category: str
    mastery: Literal["unknown", "learning", "known"]
    description: Optional[str] = None
    prerequisites: List[str] = []


class EdgeData(BaseModel):
    """Knowledge graph edge."""
    id: str
    from_node: str  # Changed from 'from' to avoid Python keyword
    to_node: str    # Changed from 'to' to avoid Python keyword
    label: Optional[str] = "prerequisite"


class KnowledgeGraphResponse(BaseModel):
    """Complete knowledge graph response."""
    nodes: List[NodeData]
    edges: List[EdgeData]
    stats: dict


class UpdateMasteryRequest(BaseModel):
    """Request to update node mastery."""
    mastery: Literal["unknown", "learning", "known"]


# ===== Endpoints =====

@router.get("", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    category: Optional[str] = None,
    mastery: Optional[str] = None,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the complete knowledge graph with user-specific mastery levels.
    
    - **category**: Filter by category (optional)
    - **mastery**: Filter by mastery level (unknown, learning, known) (optional)
    """
    try:
        graph_data = await service.get_user_knowledge_graph(
            user_id=str(user.id),
            category_filter=category,
            mastery_filter=mastery
        )
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch knowledge graph: {str(e)}")


@router.patch("/{node_id}/mastery")
async def update_node_mastery(
    node_id: str,
    request: UpdateMasteryRequest,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the mastery level for a specific node.
    
    - **node_id**: The concept identifier
    - **mastery**: New mastery level (unknown, learning, known)
    """
    try:
        updated_node = await service.update_concept_mastery(
            user_id=str(user.id),
            concept_id=node_id,
            mastery=request.mastery
        )
        
        if not updated_node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        return {
            "message": f"Mastery for {node_id} updated to {request.mastery}",
            "node": updated_node
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mastery: {str(e)}")


@router.get("/categories")
async def get_categories(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all available categories in the knowledge graph."""
    try:
        categories = await service.get_all_categories()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")


@router.get("/stats")
async def get_graph_stats(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics about the user's knowledge graph."""
    try:
        stats = await service.get_user_stats(user_id=str(user.id))
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")
