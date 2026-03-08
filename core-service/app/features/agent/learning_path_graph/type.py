from pydantic import BaseModel, Field, Json
from langgraph.graph import START, END, MessagesState, StateGraph
from typing_extensions import Annotated, TypedDict
from typing import Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.features.agent.type import AgentState, AgentMode


class IntentionState(AgentState):
    """
    State tracking the intention clarification conversation.

    Focus: Understanding what the user wants to ACHIEVE (not their knowledge level)
    """
    # Extracted information
    desired_outcome: str | None = None
    context: dict | None = None
    topic: str | None = None

    # Learning path
    concept_graph: list[dict] | None = None

    # Flow control
    is_intention_clear: bool = False
    follow_up_count: int = 0


class IntentionAnalysis(BaseModel):
    """Structured output from intention evaluator."""
    desired_outcome: str | None = Field(
        None,
        description="What the user wants to achieve, do, or create. Must be action-oriented (e.g., 'build X', 'analyze Y', 'create Z')"
    )
    context: dict | None = Field(
        None,
        description="Optional context: background, timeline, constraints. Only include if user mentions them."
    )
    is_clear: bool = Field(
        description="Is the intention clear and actionable? True if it specifies WHAT they want to do/create, False if vague (e.g., 'learn X')"
    )
    reasoning: str = Field(
        description="Brief explanation of why the intention is clear or not clear"
    )


class IntentionOutput(BaseModel):
    """Final formatted output from intention clarification."""
    topic: str = Field(
        description="A concise topic/subject for this learning path (2-4 words). Examples: 'Web Development', 'Data Analysis', 'Machine Learning'"
    )
    desired_outcome: str = Field(
        description="Clear statement of what the user wants to achieve/do/create"
    )
    context: dict | None = Field(
        None,
        description="Optional context including background, timeline, constraints"
    )
    summary: str = Field(
        description="A brief 1-2 sentence summary of the user's learning intention"
    )


class GoalDefinitionState(IntentionState):
    """
    Extends IntentionState with goal-related fields.
    """
    learning_goal: str | None = None
    competencies: list[str] | None = None
    success_criteria: list[str] | None = None


class LearningGoalDefinition(BaseModel):
    """Structured learning goal with competencies and success criteria."""

    learning_goal: str = Field(
        description="A clear, formal statement of what the learner will be able to do. Should start with 'By the end of this learning path, you will be able to...'"
    )

    competencies: list[str] = Field(
        description="List of 4-7 specific skills or abilities needed to achieve the goal.",
        min_length=4,
        max_length=7
    )

    success_criteria: list[str] = Field(
        description="List of 3-5 observable indicators that the goal has been achieved.",
        min_length=3,
        max_length=5
    )


class ConceptGraphState(GoalDefinitionState):
    """
    Extends GoalDefinitionState with concept graph.
    """
    concept_graph: list[dict] | None = None
