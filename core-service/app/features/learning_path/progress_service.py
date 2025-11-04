"""
Learning Path Progress Service

Business logic for tracking and calculating learning path progress.
Automatically syncs with Knowledge Graph for mastery levels.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import List, Dict, Optional
from app.features.learning_path.progress_models import LearningPathProgress, ProgressStatus
from app.features.users.knowledge.service import UserKnowledgeService


class LearningPathProgressService:
    """Service for tracking and calculating learning path progress"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.kg_service = UserKnowledgeService()  # Fixed: no db parameter needed
    
    async def initialize_path_progress(
        self, 
        user_id: int, 
        thread_id: str, 
        concept_names: List[str]
    ) -> List[LearningPathProgress]:
        """
        Initialize progress tracking for all concepts in a learning path.
        Called when a learning path is created.
        
        Args:
            user_id: User ID
            thread_id: Learning path conversation thread ID
            concept_names: List of concept names in the path
            
        Returns:
            List of created progress records
        """
        progress_records = []
        
        for concept_name in concept_names:
            # Check if progress already exists
            result = await self.db.execute(
                select(LearningPathProgress).where(
                    and_(
                        LearningPathProgress.user_id == user_id,
                        LearningPathProgress.thread_id == thread_id,
                        LearningPathProgress.concept_name == concept_name
                    )
                )
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                progress = LearningPathProgress(
                    user_id=user_id,
                    thread_id=thread_id,
                    concept_name=concept_name,
                    mastery_level=0.0,
                    status=ProgressStatus.NOT_STARTED.value
                )
                self.db.add(progress)
                progress_records.append(progress)
        
        await self.db.commit()
        return progress_records
    
    async def update_concept_progress(
        self, 
        user_id: int, 
        thread_id: str, 
        concept_name: str,
        time_spent: int = 0,
        completed_content: bool = False
    ) -> LearningPathProgress:
        """
        Update progress for a specific concept based on user activity.
        
        Args:
            user_id: User ID
            thread_id: Learning path thread ID
            concept_name: Name of concept to update
            time_spent: Additional seconds spent (optional)
            completed_content: Whether user completed related content (optional)
        
        Returns:
            Updated progress record
        """
        # Get or create progress record
        result = await self.db.execute(
            select(LearningPathProgress).where(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id,
                    LearningPathProgress.concept_name == concept_name
                )
            )
        )
        progress = result.scalar_one_or_none()
        
        if not progress:
            progress = LearningPathProgress(
                user_id=user_id,
                thread_id=thread_id,
                concept_name=concept_name
            )
            self.db.add(progress)
        
        # Get mastery from knowledge graph
        kg_mastery = self._get_concept_mastery_from_kg(user_id, concept_name)
        progress.mastery_level = kg_mastery
        
        # Update statistics
        if time_spent > 0:
            progress.total_time_spent += time_spent
        
        if completed_content:
            progress.content_count += 1
        
        # Update status based on mastery
        if progress.mastery_level >= 0.7:
            progress.status = ProgressStatus.MASTERED.value
            if not progress.completed_at:
                progress.completed_at = datetime.utcnow()
        elif progress.mastery_level > 0.0:
            progress.status = ProgressStatus.IN_PROGRESS.value
            if not progress.started_at:
                progress.started_at = datetime.utcnow()
        
        progress.last_interaction_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(progress)
        
        return progress
    
    def _get_concept_mastery_from_kg(self, user_id: int, concept_name: str) -> float:
        """
        Get mastery level for a concept from the knowledge graph.
        
        Args:
            user_id: User ID
            concept_name: Concept name to look up
            
        Returns:
            Mastery level (0.0 to 1.0)
        """
        try:
            # Query knowledge graph for user's mastery of this concept
            knowledge_states = self.kg_service.get_knowledge_state(user_id)
            
            # Find matching concept (case-insensitive)
            for state in knowledge_states:
                if state.concept_name.lower() == concept_name.lower():
                    return state.mastery_level
            
            return 0.0  # Not in KG yet
        except Exception as e:
            print(f"Error getting mastery from KG: {e}")
            return 0.0
    
    async def get_path_progress(self, user_id: int, thread_id: str) -> Dict:
        """
        Get overall progress for a learning path.
        
        Args:
            user_id: User ID
            thread_id: Learning path thread ID
            
        Returns:
            Dict with overall stats and per-concept progress
        """
        result = await self.db.execute(
            select(LearningPathProgress).where(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id
                )
            )
        )
        progress_records = result.scalars().all()
        
        if not progress_records:
            return {
                "total_concepts": 0,
                "completed_concepts": 0,
                "in_progress_concepts": 0,
                "overall_progress": 0.0,
                "average_mastery": 0.0,
                "total_time_spent": 0,
                "concepts": []
            }
        
        completed = sum(1 for p in progress_records if p.status == ProgressStatus.MASTERED.value)
        in_progress = sum(1 for p in progress_records if p.status == ProgressStatus.IN_PROGRESS.value)
        total_mastery = sum(p.mastery_level for p in progress_records)
        total_time = sum(p.total_time_spent for p in progress_records)
        
        return {
            "total_concepts": len(progress_records),
            "completed_concepts": completed,
            "in_progress_concepts": in_progress,
            "overall_progress": (completed / len(progress_records)) * 100 if progress_records else 0.0,
            "average_mastery": total_mastery / len(progress_records) if progress_records else 0.0,
            "total_time_spent": total_time,
            "concepts": [
                {
                    "name": p.concept_name,
                    "mastery_level": p.mastery_level,
                    "status": p.status,
                    "time_spent": p.total_time_spent,
                    "content_count": p.content_count,
                    "started_at": p.started_at.isoformat() if p.started_at else None,
                    "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                }
                for p in progress_records
            ]
        }
    
    async def get_next_concept(self, user_id: int, thread_id: str) -> Optional[str]:
        """
        Get the next concept to focus on in the learning path.
        
        Args:
            user_id: User ID
            thread_id: Learning path thread ID
            
        Returns:
            Concept name or None if all mastered
        """
        result = await self.db.execute(
            select(LearningPathProgress)
            .where(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id
                )
            )
            .order_by(LearningPathProgress.created_at)
        )
        progress_records = result.scalars().all()
        
        # Find first non-mastered concept
        for progress in progress_records:
            if progress.status != ProgressStatus.MASTERED.value:
                return progress.concept_name
        
        return None  # All concepts mastered!
    
    async def sync_all_progress_from_kg(self, user_id: int, thread_id: str) -> int:
        """
        Sync all concept progress with current Knowledge Graph mastery levels.
        Useful for batch updates after assessments or major learning activities.
        
        Args:
            user_id: User ID
            thread_id: Learning path thread ID
            
        Returns:
            Number of progress records updated
        """
        result = await self.db.execute(
            select(LearningPathProgress).where(
                and_(
                    LearningPathProgress.user_id == user_id,
                    LearningPathProgress.thread_id == thread_id
                )
            )
        )
        progress_records = result.scalars().all()
        
        updated_count = 0
        
        for progress in progress_records:
            old_mastery = progress.mastery_level
            new_mastery = self._get_concept_mastery_from_kg(user_id, progress.concept_name)
            
            if abs(new_mastery - old_mastery) > 0.01:  # Only update if changed significantly
                progress.mastery_level = new_mastery
                
                # Update status based on new mastery
                if new_mastery >= 0.7:
                    progress.status = ProgressStatus.MASTERED.value
                    if not progress.completed_at:
                        progress.completed_at = datetime.utcnow()
                elif new_mastery > 0.0:
                    progress.status = ProgressStatus.IN_PROGRESS.value
                    if not progress.started_at:
                        progress.started_at = datetime.utcnow()
                
                progress.last_interaction_at = datetime.utcnow()
                updated_count += 1
        
        if updated_count > 0:
            await self.db.commit()
        
        return updated_count
