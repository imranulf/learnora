from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Prompt for evaluating intention clarity
evaluator_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert at understanding learning goals. Analyze the conversation to extract the user's learning intention.

CURRENT STATE:
- Desired Outcome: {desired_outcome}
- Context: {context}

YOUR TASK:
1. Extract what the user wants to DO/CREATE/ACHIEVE (not what they want to "learn")
2. Capture any context they mention (timeline, background, constraints)
3. Determine if the intention is CLEAR and ACTIONABLE

CLARITY CRITERIA - Intention is CLEAR if:
- Contains an ACTION verb (build, create, analyze, develop, automate, design, etc.)
- Specifies WHAT they want to create or do
- Concrete enough to break into learning concepts

CLARITY CRITERIA - Intention is NOT CLEAR if:
- Just says "learn X" or "understand Y" (too vague — needs a specific goal or output)
- No specific output or action mentioned
- Too broad (e.g., "backend development" without a specific goal)

EXAMPLES:
CLEAR:
- "Build a chatbot for customer service"
- "Analyze sales data to predict trends"
- "Create a portfolio website with animations"
- "Automate my email workflows with Python"

NOT CLEAR:
- "Learn Python"
- "Understand machine learning"
- "Get better at web development"
- "I want to learn DevOps"

Analyze the latest user response and determine clarity."""
    ),
    MessagesPlaceholder(variable_name="messages"),
])


# Prompt for generating follow-up questions
followup_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a learning guide helping users clarify their learning goals. The user's goal is currently too vague.

CURRENT STATE:
- Desired Outcome: {desired_outcome}
- Context: {context}
- Follow-up Count: {follow_up_count}/1

YOUR TASK:
This is your only follow-up question, so make it count!
Generate ONE focused clarifying question to help the user specify WHAT they want to DO or CREATE.

QUESTION STRATEGIES:
1. If they said "learn X" -> Ask "What do you want to BUILD or CREATE with X?" and offer 2-3 concrete examples
2. If too broad -> Ask for a specific example or use case
3. If multiple paths -> Offer 2-3 options to choose from
4. If abstract -> Ask for concrete outcome

RULES:
- Ask ONLY ONE question
- Keep it conversational and friendly
- Focus on extracting a concrete ACTION or OUTPUT
- Offer examples or choices if helpful
- Don't ask about their knowledge level (we'll assess that later)

Your question:"""
    ),
    MessagesPlaceholder(variable_name="messages"),
])

# Prompt for formatting output
formatter_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are summarizing a user's learning intention. Create a clean, structured summary.

EXTRACTED INFORMATION:
- Desired Outcome: {desired_outcome}
- Context: {context}

YOUR TASK:
1. Create a concise TOPIC (2-4 words) that represents the subject area
2. Ensure the desired_outcome is clearly stated and action-oriented
3. Preserve any context provided (timeline, background, constraints)
4. Write a brief 1-2 sentence SUMMARY of their overall learning intention

TOPIC GUIDELINES:
- Keep it short and general (2-4 words)
- Focus on the domain/subject, not the specific goal
- Use title case

Format the output now:"""
    ),
    MessagesPlaceholder(variable_name="messages"),
])

# Prompt for goal definition
goal_definition_prompt = ChatPromptTemplate.from_messages([
    (
        "human",
        """You are an expert instructional designer creating formal learning objectives.

USER'S INTENTION:
- Topic: {topic}
- Desired Outcome: {desired_outcome}
- Context: {context}

YOUR TASK:
Transform this intention into a structured learning goal with competencies and success criteria.

1. LEARNING GOAL:
   - Write a clear, formal statement starting with: "By the end of this learning path, you will be able to..."
   - Make it specific, achievable, and directly related to their desired outcome

2. COMPETENCIES (4-7 specific skills):
   - Break down the goal into concrete skills/abilities needed
   - Each should be a building block toward the main goal
   - Make them measurable and observable
   - Order from foundational to advanced

3. SUCCESS CRITERIA (3-5 indicators):
   - Define what demonstrable evidence shows goal achievement
   - Focus on tangible outputs or capabilities
   - Make them testable/observable

Generate the learning goal definition now:"""
    )
])

# JSON output format specification
JSON_OUTPUT_FORMAT = """
You must output ONLY a valid JSON array with NO additional text, explanation, or commentary.
Your response must be a single JSON code block containing an array of concept objects.

REQUIRED FORMAT:
[
  {{"concept": "ConceptName1", "prerequisites": []}},
  {{"concept": "ConceptName2", "prerequisites": ["ConceptName1"]}},
  {{"concept": "ConceptName3", "prerequisites": ["ConceptName1", "ConceptName2"]}}
]

RULES:
1. Each object must have exactly two fields: "concept" (string) and "prerequisites" (array of strings)
2. The "prerequisites" array lists concept names that must be learned first (empty array if none)
3. Keep number of concepts between 8-15 for a comprehensive path
4. Order concepts from foundational to advanced based on dependency chains
5. Return ONLY the JSON array - no markdown formatting, no backticks, no explanation text
"""

# Prompt for concept graph generation
concept_graph_prompt = ChatPromptTemplate.from_messages([
    (
        "human",
        """You are an expert learning path designer. Based on the learning goal and competencies, create a comprehensive concept graph.

LEARNING CONTEXT:
- Topic: {topic}
- Learning Goal: {learning_goal}
- Competencies:
{competencies_text}

YOUR TASK:
Generate a prerequisite graph of learning concepts that will help achieve these competencies.

CONCEPT BREAKDOWN STRATEGY:
1. Analyze each competency and identify the underlying concepts needed
2. Start with foundational concepts (no prerequisites)
3. Build up to intermediate concepts (depend on foundations)
4. End with advanced/integration concepts (combine multiple prerequisites)
5. Ensure concepts are specific, learnable units (not too broad)

PREREQUISITE RULES:
- Only list DIRECT prerequisites (concepts immediately needed)
- Don't list transitive dependencies
- Foundational concepts have empty prerequisite arrays
- Each concept name must be used exactly as written in prerequisites

QUALITY GUIDELINES:
- Concepts should be atomic and focused (one main idea each)
- Names should be clear and descriptive
- Aim for 8-15 total concepts
- Create a logical learning progression

""" + JSON_OUTPUT_FORMAT
    )
])
