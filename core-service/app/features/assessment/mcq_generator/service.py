"""MCQ Generation Agent Service using LangChain.

Provides LLM-powered multiple choice question generation with:
- Structured output using Pydantic models
- Learning path context for prerequisite-aware questions
- Difficulty-aware question generation
- Integration with the assessment item bank
"""

from typing import Optional, List, Dict
import logging
import json

from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.assessment.mcq_generator.schemas import (
    MCQGenerationResponse,
    MCQQuestion,
    DifficultyLevel,
)
from app.features.assessment.mcq_generator.utils import build_learning_path_context
from app.features.users.models import User

logger = logging.getLogger(__name__)

# LLM Configuration
LLM_MODEL = "gemini-2.5-flash"
LLM_PROVIDER = "google_genai"
LLM_TEMPERATURE = 0.7
LLM_TIMEOUT = 60
LLM_MAX_RETRIES = 2


class MCQGeneratorAgent:
    """
    Agent for generating multiple-choice questions using LangChain.

    Uses structured output parsing to ensure reliable MCQ generation
    with proper validation.
    """

    def __init__(
        self,
        model_name: str = LLM_MODEL,
        model_provider: str = LLM_PROVIDER,
        temperature: float = LLM_TEMPERATURE
    ):
        """
        Initialize the MCQ generator agent.

        Args:
            model_name: Model to use (default: gemini-2.5-flash)
            model_provider: Model provider (default: google_genai)
            temperature: Temperature for generation (0.0-1.0, default: 0.7)
        """
        self.llm = init_chat_model(
            model_name,
            model_provider=model_provider,
            temperature=temperature,
            timeout=LLM_TIMEOUT,
            max_retries=LLM_MAX_RETRIES
        )

        # Create structured output LLM
        self.structured_llm = self.llm.with_structured_output(MCQGenerationResponse)

        # System prompt for MCQ generation
        self.system_prompt = """You are an expert educational AI tutor specializing in creating high-quality multiple-choice questions for learning assessment.

Your role is to generate MCQ questions that:
1. Test CONCEPTUAL UNDERSTANDING, not rote memorization
2. Are clear, unambiguous, and appropriate for the specified difficulty level
3. Have exactly 4 options (A, B, C, D) with only ONE correct answer
4. Include explanations that help learners understand WHY the answer is correct
5. Consider the learner's background and prerequisite knowledge
6. Are challenging but fair for the given difficulty level

Guidelines for difficulty levels:
- Beginner: Test basic definitions, simple concepts, and foundational understanding
- Intermediate: Test application of concepts, relationships, and practical scenarios
- Advanced: Test deep understanding, edge cases, integration of multiple concepts, and critical thinking

Always consider the learning path context to ensure questions build appropriately on prerequisite knowledge."""

        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", "{user_prompt}")
        ])

    def _build_user_prompt(
        self,
        concept_name: str,
        concept_description: str,
        learning_path_context: str,
        difficulty_level: str,
        question_count: int
    ) -> str:
        """
        Build the user prompt for MCQ generation.

        Args:
            concept_name: Name of the concept
            concept_description: Description of the concept
            learning_path_context: Context from the learning path
            difficulty_level: Difficulty level
            question_count: Number of questions to generate

        Returns:
            Formatted user prompt
        """
        return f"""Generate {question_count} multiple-choice questions about the following concept:

**Concept**: {concept_name}

**Context**: {concept_description}

**Prerequisites & Learning Path**:
{learning_path_context}

**Difficulty Level**: {difficulty_level}

Requirements:
- Generate EXACTLY {question_count} questions
- Each question must have EXACTLY 4 options (A, B, C, D)
- Mark the correct answer clearly (A, B, C, or D)
- Provide a clear explanation for each answer
- Questions should test understanding appropriate for {difficulty_level} level learners
- Consider the prerequisite knowledge from the learning path when crafting questions

Focus on creating questions that help learners verify they truly understand the concept, not just memorized facts."""

    async def generate_mcqs(
        self,
        concept_name: str,
        difficulty_level: DifficultyLevel,
        question_count: int = 5,
        concept_description: Optional[str] = None,
        learning_path_context: Optional[str] = None,
    ) -> MCQGenerationResponse:
        """
        Generate MCQ questions for a given concept.

        Args:
            concept_name: The concept for which to generate questions
            difficulty_level: Difficulty level (Beginner/Intermediate/Advanced)
            question_count: Number of questions to generate (1-20)
            concept_description: Optional description of the concept
            learning_path_context: Optional learning path context string

        Returns:
            MCQGenerationResponse with generated questions

        Raises:
            Exception: If agent fails to generate valid MCQs
        """
        # Use defaults if not provided
        description = concept_description or f"A concept in the domain of {concept_name}"
        lp_context = learning_path_context or "No prerequisite information provided."

        # Build the user prompt
        user_prompt = self._build_user_prompt(
            concept_name=concept_name,
            concept_description=description,
            learning_path_context=lp_context,
            difficulty_level=difficulty_level.value,
            question_count=question_count
        )

        try:
            # Create chain and invoke
            chain = self.prompt_template | self.structured_llm
            result = await chain.ainvoke({"user_prompt": user_prompt})

            if not result or not result.questions:
                raise Exception("Agent failed to generate MCQ questions")

            # Validate question count
            if len(result.questions) != question_count:
                logger.warning(
                    f"Expected {question_count} questions, got {len(result.questions)}"
                )

            logger.info(
                f"Generated {len(result.questions)} MCQs for concept '{concept_name}' "
                f"at {difficulty_level.value} difficulty"
            )

            return result

        except Exception as e:
            logger.error(f"Error generating MCQs for '{concept_name}': {e}")
            raise

    async def generate_mcqs_with_learning_path(
        self,
        db: AsyncSession,
        current_user: User,
        concept_name: str,
        difficulty_level: DifficultyLevel,
        question_count: int = 5,
        concept_description: Optional[str] = None,
        learning_path_thread_id: Optional[str] = None,
        concept_id: Optional[str] = None,
    ) -> MCQGenerationResponse:
        """
        Generate MCQ questions with learning path context.

        Args:
            db: Database session
            current_user: Current authenticated user
            concept_name: The concept for which to generate questions
            difficulty_level: Difficulty level
            question_count: Number of questions to generate
            concept_description: Optional description of the concept
            learning_path_thread_id: Thread ID to fetch learning path
            concept_id: Concept ID for prerequisite extraction

        Returns:
            MCQGenerationResponse with generated questions
        """
        lp_context = "No prerequisite information provided."

        # Fetch learning path if thread_id provided
        if learning_path_thread_id:
            try:
                from app.features.learning_path.service import LearningPathService

                lp_service = LearningPathService()
                lp_data = await lp_service.get_learning_path_kg_info(
                    db, learning_path_thread_id
                )

                if lp_data and lp_data.get("concepts"):
                    # Convert to JSON-LD format for context extraction
                    concepts_jsonld = []
                    for c in lp_data["concepts"]:
                        concept_dict = {
                            "@id": f"http://learnora.ai/kg#{c['id']}",
                            "http://learnora.ai/kg#label": [{"@value": c["label"]}],
                        }
                        if c.get("prerequisites"):
                            concept_dict["http://learnora.ai/kg#hasPrerequisite"] = [
                                {"@id": f"http://learnora.ai/kg#{p}"} for p in c["prerequisites"]
                            ]
                        concepts_jsonld.append(concept_dict)

                    if concept_id:
                        lp_context = build_learning_path_context(
                            concepts_jsonld,
                            f"http://learnora.ai/kg#{concept_id}"
                        )
                    else:
                        # Build general context
                        concept_names = [c["label"] for c in lp_data["concepts"]]
                        lp_context = f"Learning path concepts: {', '.join(concept_names[:10])}"

            except Exception as e:
                logger.warning(f"Failed to fetch learning path context: {e}")

        return await self.generate_mcqs(
            concept_name=concept_name,
            difficulty_level=difficulty_level,
            question_count=question_count,
            concept_description=concept_description,
            learning_path_context=lp_context,
        )


# Singleton instance
_mcq_agent: Optional[MCQGeneratorAgent] = None


def get_mcq_agent() -> MCQGeneratorAgent:
    """
    Get or create the singleton MCQ generator agent.

    Returns:
        MCQGeneratorAgent instance
    """
    global _mcq_agent
    if _mcq_agent is None:
        _mcq_agent = MCQGeneratorAgent()
    return _mcq_agent


def mcq_to_assessment_items(
    questions: List[MCQQuestion],
    skill: str,
    difficulty_level: DifficultyLevel,
    item_code_prefix: str = "MCQ"
) -> List[Dict]:
    """
    Convert MCQ questions to assessment item format for the item bank.

    Args:
        questions: List of MCQQuestion objects
        skill: Skill/knowledge domain for the items
        difficulty_level: Difficulty level (maps to IRT parameters)
        item_code_prefix: Prefix for generated item codes

    Returns:
        List of item dictionaries ready for database insertion
    """
    # Map difficulty to IRT parameters
    difficulty_params = {
        DifficultyLevel.BEGINNER: {"a": 0.8, "b": -1.5},
        DifficultyLevel.INTERMEDIATE: {"a": 1.0, "b": 0.0},
        DifficultyLevel.ADVANCED: {"a": 1.2, "b": 1.5},
    }

    params = difficulty_params.get(difficulty_level, {"a": 1.0, "b": 0.0})

    items = []
    for i, q in enumerate(questions):
        # Convert correct answer letter to index
        correct_index = {"A": 0, "B": 1, "C": 2, "D": 3}[q.correct_answer]

        item = {
            "item_code": f"{item_code_prefix}_{skill}_{i+1}_{hash(q.question) % 10000:04d}",
            "skill": skill,
            "discrimination": params["a"],
            "difficulty": params["b"],
            "text": q.question,
            "choices": [q.options.A, q.options.B, q.options.C, q.options.D],
            "correct_index": correct_index,
            "metadata": {
                "explanation": q.explanation,
                "difficulty_level": difficulty_level.value,
                "source": "mcq_generator",
            }
        }
        items.append(item)

    return items
