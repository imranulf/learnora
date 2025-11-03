"""API router for concept operations."""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from app.features.concept.service import ConceptService
from app.features.users.users import current_active_user as get_current_user
from app.features.users.models import User

router = APIRouter()
service = ConceptService()


class ConceptCreate(BaseModel):
    """Request model for creating a concept."""
    concept_id: str = Field(..., description="Unique identifier")
    label: str = Field(..., description="Human-readable name")
    description: Optional[str] = Field(None, description="Detailed description")
    category: Optional[str] = Field("General", description="Category (e.g., Programming, Math)")
    difficulty: Optional[str] = Field("Beginner", description="Difficulty level")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for searching")
    prerequisites: Optional[List[str]] = Field(default_factory=list, description="Prerequisite concept IDs")


class ConceptUpdate(BaseModel):
    """Request model for updating a concept."""
    label: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None


class ConceptResponse(BaseModel):
    """Response model for concept information."""
    id: str
    label: str
    description: Optional[str] = None
    category: str = "General"
    difficulty: str = "Beginner"
    tags: List[str] = []
    prerequisites: List[str] = []
    created_at: Optional[str] = None


class ConceptListResponse(BaseModel):
    """Response model for paginated concept list."""
    items: List[ConceptResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.post("/", response_model=ConceptResponse)
def create_concept(
    concept: ConceptCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new concept in the knowledge graph.
    
    - **concept_id**: Unique identifier (e.g., "python_basics", "machine_learning")
    - **label**: Human-readable name
    - **description**: Optional detailed description
    - **category**: Category (e.g., Programming, Math, Science)
    - **difficulty**: Difficulty level (Beginner, Intermediate, Advanced, Expert)
    - **tags**: List of tags for searching
    - **prerequisites**: List of prerequisite concept IDs
    """
    try:
        result = service.create_concept_extended(
            concept_id=concept.concept_id,
            label=concept.label,
            description=concept.description,
            category=concept.category,
            difficulty=concept.difficulty,
            tags=concept.tags,
            prerequisites=concept.prerequisites
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create concept: {str(e)}")


@router.get("/", response_model=ConceptListResponse)
def list_concepts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    current_user: User = Depends(get_current_user)
):
    """
    List all concepts with pagination and filters.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Search in title, description, tags
    - **category**: Filter by category
    - **difficulty**: Filter by difficulty
    """
    try:
        result = service.list_concepts_paginated(
            page=page,
            page_size=page_size,
            search=search,
            category=category,
            difficulty=difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list concepts: {str(e)}")


@router.get("/{concept_id}", response_model=ConceptResponse)
def get_concept(
    concept_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get information about a specific concept.
    
    - **concept_id**: The unique identifier of the concept
    """
    try:
        concept = service.get_concept_details(concept_id)
        if not concept:
            raise HTTPException(status_code=404, detail="Concept not found")
        return concept
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get concept: {str(e)}")


@router.patch("/{concept_id}", response_model=ConceptResponse)
def update_concept(
    concept_id: str,
    updates: ConceptUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a concept.
    
    - **concept_id**: The unique identifier of the concept
    - **updates**: Fields to update (only provided fields will be updated)
    """
    try:
        result = service.update_concept(concept_id, updates.dict(exclude_unset=True))
        if not result:
            raise HTTPException(status_code=404, detail="Concept not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update concept: {str(e)}")


@router.delete("/{concept_id}")
def delete_concept(
    concept_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a concept.
    
    - **concept_id**: The unique identifier of the concept to delete
    """
    try:
        success = service.delete_concept(concept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Concept not found")
        return {"message": f"Concept '{concept_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete concept: {str(e)}")


@router.get("/{concept_id}/prerequisites", response_model=List[str])
def get_concept_prerequisites(concept_id: str):
    """
    Get prerequisites for a specific concept.
    
    - **concept_id**: The unique identifier of the concept
    """
    concept_uri = service.get_concept(concept_id)
    if not concept_uri:
        raise HTTPException(status_code=404, detail="Concept not found")
    
    prereq_uris = service.get_concept_prerequisites(concept_id)
    return [str(uri).split("#")[-1] for uri in prereq_uris]



@router.get("/", response_model=ConceptListResponse)
def list_concepts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    current_user: dict = Depends(get_current_user)
):
    """
    List all concepts with pagination and filters.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Search in title, description, tags
    - **category**: Filter by category
    - **difficulty**: Filter by difficulty
    """
    try:
        result = service.list_concepts_paginated(
            page=page,
            page_size=page_size,
            search=search,
            category=category,
            difficulty=difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list concepts: {str(e)}")


@router.get("/{concept_id}", response_model=ConceptResponse)
def get_concept(
    concept_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about a specific concept.
    
    - **concept_id**: The unique identifier of the concept
    """
    try:
        concept = service.get_concept_details(concept_id)
        if not concept:
            raise HTTPException(status_code=404, detail="Concept not found")
        return concept
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get concept: {str(e)}")


@router.patch("/{concept_id}", response_model=ConceptResponse)
def update_concept(
    concept_id: str,
    updates: ConceptUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a concept.
    
    - **concept_id**: The unique identifier of the concept
    - **updates**: Fields to update (only provided fields will be updated)
    """
    try:
        result = service.update_concept(concept_id, updates.dict(exclude_unset=True))
        if not result:
            raise HTTPException(status_code=404, detail="Concept not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update concept: {str(e)}")


@router.delete("/{concept_id}")
def delete_concept(
    concept_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a concept.
    
    - **concept_id**: The unique identifier of the concept to delete
    """
    try:
        success = service.delete_concept(concept_id)
        if not success:
            raise HTTPException(status_code=404, detail="Concept not found")
        return {"message": f"Concept '{concept_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete concept: {str(e)}")


@router.get("/{concept_id}/prerequisites", response_model=List[str])
def get_concept_prerequisites(concept_id: str):
    """
    Get prerequisites for a specific concept.
    
    - **concept_id**: The unique identifier of the concept
    """
    concept_uri = service.get_concept(concept_id)
    if not concept_uri:
        raise HTTPException(status_code=404, detail="Concept not found")
    
    prereq_uris = service.get_concept_prerequisites(concept_id)
    return [str(uri).split("#")[-1] for uri in prereq_uris]
