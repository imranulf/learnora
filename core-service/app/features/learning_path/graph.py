"""Learning Path generation graphs using LangGraph.

Provides two graph variants:
1. `graph` - Simple 2-node workflow (assess → generate) for backward compatibility
2. `enhanced_graph` - 6-node multi-turn workflow with intention clarification

The enhanced workflow follows Learnora-Mahee's sophisticated approach:
- Step 1: Intention Clarification (ask → evaluate → follow-up loop)
- Step 2: Goal Definition (competencies, success criteria)
- Step 3: Concept Graph Generation (prerequisite relationships)
"""

from langchain_core.language_models.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, END, MessagesState, StateGraph
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from typing import Sequence, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import Annotated, TypedDict
from langgraph.types import Command, interrupt
import logging
import json

from app.features.learning_path.types import (
    LearningPathState,
    IntentionState,
    GoalDefinitionState,
    ConceptGraphState,
    IntentionAnalysis,
    IntentionOutput,
    LearningGoalDefinition,
    AgentMode,
)
from app.features.learning_path.prompts import (
    evaluator_prompt,
    followup_prompt,
    formatter_prompt,
    goal_definition_prompt,
    concept_graph_prompt,
    assessment_prompt,
    generation_prompt,
)

logger = logging.getLogger(__name__)

# LLM configuration with timeout
LLM_TIMEOUT_SECONDS = 60  # 60 second timeout for LLM calls
LLM_MAX_RETRIES = 2

# Initialize the model with timeout configuration
model = init_chat_model(
    "gemini-2.5-flash",
    model_provider="google_genai",
    timeout=LLM_TIMEOUT_SECONDS,
    max_retries=LLM_MAX_RETRIES
)

# Maximum follow-up questions before forcing output
MAX_FOLLOW_UPS = 2


# ============================================================
# SIMPLE GRAPH (Backward Compatible)
# ============================================================

def assess_knowledge(state: LearningPathState) -> LearningPathState:
    """Assess user's current knowledge level."""
    topic = state.get("topic")

    if topic is None:
        responed_topic = interrupt("Please provide a topic you want to learn about.")
        topic = responed_topic

    state["topic"] = topic
    prompt = assessment_prompt.invoke(state)

    try:
        response = model.invoke(prompt)
    except TimeoutError as e:
        logger.error(f"LLM timeout during knowledge assessment for topic '{topic}': {e}")
        error_response = AIMessage(
            content="I apologize, but the request timed out. Please try again."
        )
        return {"messages": [error_response], "topic": topic}
    except Exception as e:
        logger.error(f"LLM error during knowledge assessment for topic '{topic}': {e}")
        error_response = AIMessage(
            content="I encountered an error while processing your request. Please try again later."
        )
        return {"messages": [error_response], "topic": topic}

    return {"messages": [response], "topic": topic}


def generate_learning_path(state: LearningPathState) -> LearningPathState:
    """Generate learning path based on assessment."""
    prompt = generation_prompt.invoke(state)

    try:
        response = model.invoke(prompt)
    except TimeoutError as e:
        logger.error(f"LLM timeout during learning path generation: {e}")
        error_response = AIMessage(
            content="I apologize, but generating the learning path timed out. Please try again."
        )
        return {"messages": [error_response]}
    except Exception as e:
        logger.error(f"LLM error during learning path generation: {e}")
        error_response = AIMessage(
            content="I encountered an error while generating your learning path. Please try again later."
        )
        return {"messages": [error_response]}

    return {"messages": [response]}


# --- Simple Graph Construction ---
builder = StateGraph(LearningPathState)
builder.add_node("assess_knowledge", assess_knowledge)
builder.add_node("generate_learning_path", generate_learning_path)
builder.add_edge(START, "assess_knowledge")
builder.add_edge("assess_knowledge", "generate_learning_path")
builder.add_edge("generate_learning_path", END)

memory = MemorySaver()
graph = builder.compile(checkpointer=memory, interrupt_before=["generate_learning_path"])


# ============================================================
# ENHANCED GRAPH (Multi-turn Intention Clarification)
# ============================================================

# Create structured output LLMs
evaluator_llm = model.with_structured_output(IntentionAnalysis)
formatter_llm = model.with_structured_output(IntentionOutput)
goal_definition_llm = model.with_structured_output(LearningGoalDefinition)


# ----- Step 1: Intention Clarification -----

def initial_asker(state: IntentionState) -> dict:
    """
    Node 1: Ask the opening question.
    Returns a fixed, predefined question - no LLM needed.
    """
    opening_question = (
        "Hi! I'm here to help you learn something new. "
        "To get started, could you tell me: **What would you like to be able to do?**\n\n"
        "For example:\n"
        "- Build a web application\n"
        "- Analyze data from spreadsheets\n"
        "- Create automated scripts\n"
        "- Develop a mobile app"
    )
    return {"messages": [AIMessage(content=opening_question)]}


def intention_evaluator(state: IntentionState) -> dict:
    """
    Node 2: Evaluate if user's intention is clear.
    Uses structured output to extract intention and determine clarity.
    """
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not yet identified",
        "context": str(state.get("context") or "None provided"),
        "messages": state.get("messages", [])
    }

    try:
        prompt = evaluator_prompt.invoke(context_dict)
        analysis: IntentionAnalysis = evaluator_llm.invoke(prompt)

        updates = {}
        if analysis.desired_outcome:
            updates["desired_outcome"] = analysis.desired_outcome
        if analysis.context:
            existing_context = state.get("context") or {}
            updates["context"] = {**existing_context, **analysis.context}
        updates["is_intention_clear"] = analysis.is_clear

        logger.debug(f"Intention evaluation: clear={analysis.is_clear}, reasoning={analysis.reasoning}")
        return updates

    except Exception as e:
        logger.error(f"Error in intention evaluation: {e}")
        return {"is_intention_clear": False}


def route_after_evaluation(state: IntentionState) -> Literal["format_output", "ask_followup"]:
    """Decision function: proceed to output or ask follow-up."""
    is_clear = state.get("is_intention_clear", False)
    follow_up_count = state.get("follow_up_count", 0)

    if is_clear:
        logger.debug("Intention is clear → Formatting output")
        return "format_output"

    if follow_up_count >= MAX_FOLLOW_UPS:
        logger.debug(f"Max follow-ups reached ({MAX_FOLLOW_UPS}) → Forcing output")
        return "format_output"

    logger.debug(f"Intention unclear → Asking follow-up ({follow_up_count + 1}/{MAX_FOLLOW_UPS})")
    return "ask_followup"


def followup_generator(state: IntentionState) -> dict:
    """Node 3: Generate a follow-up clarifying question."""
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not yet identified",
        "context": str(state.get("context") or "None provided"),
        "follow_up_count": state.get("follow_up_count", 0) + 1,
        "messages": state.get("messages", [])
    }

    try:
        prompt = followup_prompt.invoke(context_dict)
        response = model.invoke(prompt)
        new_count = state.get("follow_up_count", 0) + 1

        return {
            "messages": [response],
            "follow_up_count": new_count
        }
    except Exception as e:
        logger.error(f"Error generating follow-up: {e}")
        return {
            "messages": [AIMessage(content="Could you tell me more about what you want to achieve?")],
            "follow_up_count": state.get("follow_up_count", 0) + 1
        }


def output_formatter(state: IntentionState) -> dict:
    """Node 4: Format the final intention output."""
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not specified",
        "context": str(state.get("context") or "None provided"),
        "messages": state.get("messages", [])
    }

    try:
        prompt = formatter_prompt.invoke(context_dict)
        output: IntentionOutput = formatter_llm.invoke(prompt)

        completion_msg = (
            f"**Got it!** Here's what I understand:\n\n"
            f"**Topic:** {output.topic}\n\n"
            f"**Your Goal:** {output.desired_outcome}\n\n"
        )
        if output.context:
            completion_msg += f"**Context:** {output.context}\n\n"
        completion_msg += (
            f"**Summary:** {output.summary}\n\n"
            f"Now let's create a personalized learning path for you!"
        )

        logger.info(f"Intention clarified: topic={output.topic}")
        return {
            "topic": output.topic,
            "messages": [AIMessage(content=completion_msg)]
        }
    except Exception as e:
        logger.error(f"Error formatting output: {e}")
        # Fallback to best effort
        topic = state.get("desired_outcome", "Learning Path")[:50]
        return {
            "topic": topic,
            "messages": [AIMessage(content=f"Great! Let's create a learning path for: {topic}")]
        }


# ----- Step 2: Goal Definition -----

def define_learning_goal(state: GoalDefinitionState) -> dict:
    """Node 5: Define formal learning goal with competencies."""
    context_dict = {
        "topic": state.get("topic") or "Not specified",
        "desired_outcome": state.get("desired_outcome") or "Not specified",
        "context": str(state.get("context") or "None provided")
    }

    try:
        chain = goal_definition_prompt | goal_definition_llm
        goal_def: LearningGoalDefinition = chain.invoke(context_dict)

        message_content = (
            f"**Learning Goal Defined!**\n\n"
            f"**Goal:**\n{goal_def.learning_goal}\n\n"
            f"**Key Competencies You'll Develop:**\n"
        )
        for i, comp in enumerate(goal_def.competencies, 1):
            message_content += f"{i}. {comp}\n"

        message_content += f"\n**Success Criteria:**\n"
        for i, criteria in enumerate(goal_def.success_criteria, 1):
            message_content += f"- {criteria}\n"

        message_content += "\nNow let's map out the concepts you'll need to learn..."

        logger.info(f"Goal defined with {len(goal_def.competencies)} competencies")
        return {
            "learning_goal": goal_def.learning_goal,
            "competencies": goal_def.competencies,
            "success_criteria": goal_def.success_criteria,
            "messages": [AIMessage(content=message_content)]
        }
    except Exception as e:
        logger.error(f"Error defining goal: {e}")
        return {
            "learning_goal": f"Learn {state.get('topic', 'the subject')}",
            "competencies": ["Core fundamentals", "Practical skills", "Applied projects"],
            "success_criteria": ["Complete learning path", "Build a project"],
            "messages": [AIMessage(content="Let's continue to the concept mapping...")]
        }


# ----- Step 3: Concept Graph Generation -----

def generate_concept_graph(state: ConceptGraphState) -> dict:
    """Node 6: Generate prerequisite graph of learning concepts."""
    competencies = state.get("competencies") or []
    competencies_text = "\n".join([f"{i}. {comp}" for i, comp in enumerate(competencies, 1)])

    context_dict = {
        "topic": state.get("topic") or "Not specified",
        "learning_goal": state.get("learning_goal") or "Not specified",
        "competencies_text": competencies_text
    }

    try:
        chain = concept_graph_prompt | model
        response = chain.invoke(context_dict)

        # Parse JSON from response
        content = response.content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join([l for l in lines if not l.strip().startswith("```")])

        concept_graph = json.loads(content)

        # Validate structure
        if not isinstance(concept_graph, list):
            raise ValueError("Concept graph must be a list")

        for item in concept_graph:
            if not isinstance(item, dict) or "concept" not in item or "prerequisites" not in item:
                raise ValueError("Each concept must have 'concept' and 'prerequisites' fields")

        # Create summary message
        foundational = [c for c in concept_graph if not c["prerequisites"]]
        intermediate = [c for c in concept_graph if len(c.get("prerequisites", [])) in [1, 2]]
        advanced = [c for c in concept_graph if len(c.get("prerequisites", [])) > 2]

        message_content = (
            f"**Learning Path Concepts Mapped!**\n\n"
            f"I've broken down your learning journey into **{len(concept_graph)} key concepts**:\n\n"
        )

        if foundational:
            message_content += "**Foundational Concepts:**\n"
            for c in foundational[:5]:
                message_content += f"- {c['concept']}\n"
            if len(foundational) > 5:
                message_content += f"  ...and {len(foundational) - 5} more\n"
            message_content += "\n"

        if intermediate:
            message_content += f"**Intermediate Concepts:** {len(intermediate)} concepts\n\n"

        if advanced:
            message_content += f"**Advanced Concepts:** {len(advanced)} concepts\n\n"

        message_content += "The concepts are organized with clear prerequisites to guide your learning sequence!"

        logger.info(f"Concept graph generated with {len(concept_graph)} concepts")
        return {
            "concept_graph": concept_graph,
            "messages": [AIMessage(content=message_content)]
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse concept graph JSON: {e}")
        raise
    except Exception as e:
        logger.error(f"Error generating concept graph: {e}")
        raise


# --- Enhanced Graph Construction ---
enhanced_builder = StateGraph(ConceptGraphState)

# Step 1: Intention Clarification
enhanced_builder.add_node("ask_initial", initial_asker)
enhanced_builder.add_node("evaluate_intention", intention_evaluator)
enhanced_builder.add_node("ask_followup", followup_generator)
enhanced_builder.add_node("format_intention", output_formatter)

# Step 2: Goal Definition
enhanced_builder.add_node("define_goal", define_learning_goal)

# Step 3: Concept Graph
enhanced_builder.add_node("generate_concepts", generate_concept_graph)

# Define flow
enhanced_builder.add_edge(START, "ask_initial")
enhanced_builder.add_edge("ask_initial", "evaluate_intention")

enhanced_builder.add_conditional_edges(
    "evaluate_intention",
    route_after_evaluation,
    {
        "format_output": "format_intention",
        "ask_followup": "ask_followup"
    }
)

enhanced_builder.add_edge("ask_followup", "evaluate_intention")
enhanced_builder.add_edge("format_intention", "define_goal")
enhanced_builder.add_edge("define_goal", "generate_concepts")
enhanced_builder.add_edge("generate_concepts", END)

# Compile enhanced graph
enhanced_memory = MemorySaver()
enhanced_graph = enhanced_builder.compile(
    checkpointer=enhanced_memory,
    interrupt_before=["evaluate_intention"]  # Wait for user input
)


# --- Exports ---
__all__ = [
    "graph",
    "enhanced_graph",
    "LearningPathState",
    "ConceptGraphState",
]
