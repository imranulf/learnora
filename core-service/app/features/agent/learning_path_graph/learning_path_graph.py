from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, END, MessagesState, StateGraph
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from typing import Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field
from typing_extensions import Annotated, TypedDict
from langgraph.types import Command, interrupt
from typing import Literal
import json

from app.features.agent.learning_path_graph.prompt import (
    evaluator_prompt, followup_prompt, formatter_prompt,
    goal_definition_prompt, concept_graph_prompt
)
from app.features.agent.learning_path_graph.type import (
    ConceptGraphState, GoalDefinitionState, IntentionAnalysis,
    IntentionOutput, IntentionState, LearningGoalDefinition
)
from app.features.agent.type import AgentMode, AgentState

# Ensure GOOGLE_API_KEY is in os.environ (pydantic-settings reads .env but doesn't set env vars)
import os
from app.config import settings
if settings.GOOGLE_API_KEY and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY

# Initialize the model
model = init_chat_model("gemini-2.5-flash-lite", model_provider="google_genai")

basic_prompt_template = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the assistant of an AI-powered casual learning platform called Learnora. "
            "You help learners with questions about any topic. Be friendly, concise, and helpful. "
            "Answer all questions to the best of your ability."
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

MAX_FOLLOW_UPS = 1


def basic_call_model(state: IntentionState):
    """Handle general chat — send user's message to LLM and return response."""
    prompt = basic_prompt_template.invoke(state)
    response = model.invoke(prompt)
    return {"messages": [response]}


def basic_wait_for_input(state: IntentionState) -> dict:
    """Interrupt the graph to wait for the next user message in BASIC chat."""
    interrupt("Waiting for user input")
    return {}


def route_mode(state: IntentionState):
    if state.get('mode') == AgentMode.LPP:
        return AgentMode.LPP
    else:
        return AgentMode.BASIC


def reset_mode(state: IntentionState) -> dict:
    """Reset mode to None after LPP subgraph completes."""
    return {"mode": None}


###############################
# Node 1: Initial Asker
###############################

def initial_asker(state: IntentionState) -> dict:
    """
    Ask the opening question — but only if the user hasn't already
    provided a message. If they typed something when starting LPP mode,
    skip the static intro so the evaluator can process their input directly.
    """
    messages = state.get("messages", [])
    has_user_message = any(isinstance(m, HumanMessage) for m in messages)

    if has_user_message:
        # User already told us what they want — proceed to evaluation
        return {}

    opening_question = (
        "Hi! I'm here to help you learn something new. "
        "To get started, could you tell me: **What would you like to be able to do?**\n\n"
        "For example:\n"
        "- Build a web application\n"
        "- Analyze data from spreadsheets\n"
        "- Create automated scripts\n"
        "- Develop a mobile app"
    )
    return {
        "messages": [AIMessage(content=opening_question)]
    }


def route_after_initial(state: IntentionState) -> Literal["evaluate_intention", "wait_for_input"]:
    """
    After initial_asker: if user already sent a message, go straight to evaluation.
    Otherwise we just asked the intro question — wait for user input.
    """
    messages = state.get("messages", [])
    has_user_message = any(isinstance(m, HumanMessage) for m in messages)

    if has_user_message:
        return "evaluate_intention"
    else:
        return "wait_for_input"


###############################
# Gate Node: Wait for User Input
###############################

def wait_for_input(state: IntentionState) -> dict:
    """
    Interrupt the graph to wait for user input.
    Called only when the AI asked a question (intro or follow-up)
    and needs the user to respond before proceeding.
    """
    interrupt("Waiting for user input")
    return {}


###############################
# Node 2: Intention Evaluator
###############################

evaluator_llm = model.with_structured_output(IntentionAnalysis)


def intention_evaluator(state: IntentionState) -> dict:
    """Evaluate if user's intention is clear using structured LLM output."""
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not yet identified",
        "context": str(state.get("context") or "None provided"),
        "messages": state.get("messages", [])
    }

    prompt = evaluator_prompt.invoke(context_dict)
    analysis: IntentionAnalysis = evaluator_llm.invoke(prompt)

    updates = {}

    if analysis.desired_outcome:
        updates["desired_outcome"] = analysis.desired_outcome

    if analysis.context:
        existing_context = state.get("context") or {}
        merged_context = {**existing_context, **analysis.context}
        updates["context"] = merged_context

    updates["is_intention_clear"] = analysis.is_clear
    return updates


def route_after_evaluation(state: IntentionState) -> Literal["format_output", "ask_followup"]:
    """Route based on intention clarity and follow-up count."""
    is_clear = state.get("is_intention_clear", False)
    follow_up_count = state.get("follow_up_count", 0)

    if is_clear:
        return "format_output"

    if follow_up_count >= MAX_FOLLOW_UPS:
        return "format_output"

    return "ask_followup"


###############################
# Node 3: Follow-up Question Generator
###############################

def followup_generator(state: IntentionState) -> dict:
    """Generate a follow-up clarifying question, then wait for user input."""
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not yet identified",
        "context": str(state.get("context") or "None provided"),
        "follow_up_count": state.get("follow_up_count", 0) + 1,
        "messages": state.get("messages", [])
    }

    prompt = followup_prompt.invoke(context_dict)
    response = model.invoke(prompt)

    new_count = state.get("follow_up_count", 0) + 1

    return {
        "messages": [response],
        "follow_up_count": new_count
    }


###############################
# Node 4: Output Formatter
###############################

formatter_llm = model.with_structured_output(IntentionOutput)


def output_formatter(state: IntentionState) -> dict:
    """Format the final intention output."""
    context_dict = {
        "desired_outcome": state.get("desired_outcome") or "Not specified",
        "context": str(state.get("context") or "None provided"),
        "messages": state.get("messages", [])
    }

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

    return {
        "topic": output.topic,
        "messages": [AIMessage(content=completion_msg)]
    }


###############################
# Node 5: Goal Definition
###############################

goal_definition_llm = model.with_structured_output(LearningGoalDefinition)


def define_learning_goal(state: GoalDefinitionState) -> dict:
    """Define formal learning goal from user's intention."""
    context_dict = {
        "topic": state.get("topic") or "Not specified",
        "desired_outcome": state.get("desired_outcome") or "Not specified",
        "context": str(state.get("context") or "None provided")
    }

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

    message_content += "\nGreat! Now let's map out the concepts you'll need to learn..."

    return {
        "learning_goal": goal_def.learning_goal,
        "competencies": goal_def.competencies,
        "success_criteria": goal_def.success_criteria,
        "messages": [AIMessage(content=message_content)]
    }


###############################
# Node 6: Concept Graph Generation
###############################

def generate_concept_graph(state: ConceptGraphState) -> dict:
    """Generate prerequisite graph of learning concepts."""
    competencies = state.get("competencies") or []
    competencies_text = "\n".join([f"{i}. {comp}" for i, comp in enumerate(competencies, 1)])

    context_dict = {
        "topic": state.get("topic") or "Not specified",
        "learning_goal": state.get("learning_goal") or "Not specified",
        "competencies_text": competencies_text
    }

    chain = concept_graph_prompt | model
    response = chain.invoke(context_dict)

    # Parse JSON from response
    content = response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join([l for l in lines if not l.strip().startswith("```")])

    concept_graph = json.loads(content)

    if not isinstance(concept_graph, list):
        raise ValueError("Concept graph must be a list")

    for item in concept_graph:
        if not isinstance(item, dict) or "concept" not in item or "prerequisites" not in item:
            raise ValueError("Each concept must have 'concept' and 'prerequisites' fields")

    # Create user-facing message
    foundational = [c for c in concept_graph if not c["prerequisites"]]
    intermediate = [c for c in concept_graph if len(c["prerequisites"]) in [1, 2]]
    advanced = [c for c in concept_graph if len(c["prerequisites"]) > 2]

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

    return {
        "concept_graph": concept_graph,
        "messages": [AIMessage(content=message_content)]
    }


###############################
# Build the Learning Path Graph
###############################

learning_path_builder = StateGraph(ConceptGraphState)

# Nodes
learning_path_builder.add_node("basic_chat", basic_call_model)
learning_path_builder.add_node("basic_wait", basic_wait_for_input)
learning_path_builder.add_node("reset_mode", reset_mode)

# Step 1: Intention Clarification
learning_path_builder.add_node("ask_initial", initial_asker)
learning_path_builder.add_node("wait_for_input", wait_for_input)
learning_path_builder.add_node("evaluate_intention", intention_evaluator)
learning_path_builder.add_node("ask_followup", followup_generator)
learning_path_builder.add_node("format_intention", output_formatter)

# Step 2: Goal Definition
learning_path_builder.add_node("define_goal", define_learning_goal)

# Step 3: Concept Graph Construction
learning_path_builder.add_node("generate_concepts", generate_concept_graph)

# --- Edges ---

# START -> route by mode
learning_path_builder.add_conditional_edges(
    START,
    route_mode,
    {
        AgentMode.BASIC: "basic_chat",
        AgentMode.LPP: "ask_initial"
    }
)

# ask_initial -> either evaluate directly (user sent message) or wait for input
learning_path_builder.add_conditional_edges(
    "ask_initial",
    route_after_initial,
    {
        "evaluate_intention": "evaluate_intention",
        "wait_for_input": "wait_for_input"
    }
)

# wait_for_input -> evaluate_intention (resumes after interrupt)
learning_path_builder.add_edge("wait_for_input", "evaluate_intention")

# evaluate_intention -> format or ask follow-up
learning_path_builder.add_conditional_edges(
    "evaluate_intention",
    route_after_evaluation,
    {
        "format_output": "format_intention",
        "ask_followup": "ask_followup"
    }
)

# ask_followup -> wait_for_input (interrupt to get user response)
learning_path_builder.add_edge("ask_followup", "wait_for_input")

# format_intention -> define_goal -> generate_concepts -> reset_mode -> END
learning_path_builder.add_edge("format_intention", "define_goal")
learning_path_builder.add_edge("define_goal", "generate_concepts")
learning_path_builder.add_edge("generate_concepts", "reset_mode")
learning_path_builder.add_edge("reset_mode", END)

# basic_chat -> wait for next input -> loop back to basic_chat
learning_path_builder.add_edge("basic_chat", "basic_wait")
learning_path_builder.add_edge("basic_wait", "basic_chat")

# Compile — NO interrupt_before needed, we use explicit interrupt() in wait_for_input
learning_path_memory = MemorySaver()
learning_path_graph = learning_path_builder.compile(
    checkpointer=learning_path_memory,
)

__all__ = ["learning_path_graph", "IntentionState"]
