"""Prompt templates for Learning Path generation workflow.

Contains all prompts for the multi-turn learning path generation:
- Intention evaluation
- Follow-up question generation
- Output formatting
- Goal definition
- Concept graph generation
"""

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


# ===== Step 1: Intention Clarification Prompts =====

evaluator_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at analyzing learning intentions.

Your job is to evaluate if the user's desired learning outcome is clear and actionable.

Current understanding:
- Desired outcome: {desired_outcome}
- Context: {context}

A CLEAR intention means:
1. The user specifies WHAT they want to do/create/build (action-oriented)
2. The goal is specific enough to plan concrete learning steps
3. We understand the scope and context

Examples of CLEAR intentions:
- "Build a web application with user authentication"
- "Analyze sales data and create visualizations"
- "Create automated scripts to process files"

Examples of UNCLEAR intentions:
- "Learn Python" (too vague - what do they want to DO with Python?)
- "Get better at programming" (no specific goal)
- "Study machine learning" (what do they want to achieve?)

Analyze the conversation and determine:
1. What is the user's desired outcome (if identifiable)?
2. Is there any context (background, timeline, constraints)?
3. Is the intention clear enough to proceed?"""),
    MessagesPlaceholder(variable_name="messages"),
])

followup_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful learning assistant gathering information about what the user wants to learn.

Current understanding:
- Desired outcome: {desired_outcome}
- Context: {context}
- Follow-up question number: {follow_up_count}

The user's intention is not yet clear. Ask ONE focused follow-up question to understand:
- WHAT specifically they want to be able to DO (not just what topic to learn)
- What problem they want to solve or what they want to create

Keep your question:
- Short (1-2 sentences)
- Action-oriented (focus on what they'll DO, not what they'll know)
- Specific (avoid generic questions like "tell me more")

Good follow-up questions:
- "What would you like to be able to build or create with this skill?"
- "What problem are you trying to solve?"
- "Can you describe a project you'd like to complete?"

Avoid questions like:
- "What's your current skill level?" (we're not assessing knowledge yet)
- "Why do you want to learn this?" (not immediately actionable)"""),
    MessagesPlaceholder(variable_name="messages"),
])

formatter_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are formatting the user's learning intention into a structured summary.

Current understanding:
- Desired outcome: {desired_outcome}
- Context: {context}

Create a clean, structured summary with:
1. Topic: A concise 2-4 word subject area (e.g., "Web Development", "Data Analysis")
2. Desired outcome: What the user wants to achieve (action-oriented statement)
3. Context: Any relevant background, timeline, or constraints (if mentioned)
4. Summary: A brief 1-2 sentence overview

Be concise and action-focused. The user should feel understood."""),
    MessagesPlaceholder(variable_name="messages"),
])


# ===== Step 2: Goal Definition Prompt =====

goal_definition_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert instructional designer creating a formal learning goal.

Topic: {topic}
User's desired outcome: {desired_outcome}
Context: {context}

Create a comprehensive learning goal that includes:

1. LEARNING GOAL: A clear statement starting with "By the end of this learning path, you will be able to..."
   - Should be specific, measurable, and achievable
   - Directly addresses the user's desired outcome

2. COMPETENCIES (4-7): Specific skills or abilities needed
   - Each should be concrete and measurable
   - Order from foundational to advanced
   - Cover all aspects needed to achieve the goal

3. SUCCESS CRITERIA (3-5): Observable indicators of achievement
   - Focus on what the learner can demonstrate or produce
   - Should be verifiable through projects or assessments
   - Aligned with the learning goal

Be specific and practical. Avoid vague or generic competencies."""),
])


# ===== Step 3: Concept Graph Generation Prompt =====

concept_graph_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert curriculum designer creating a concept prerequisite graph.

Topic: {topic}
Learning Goal: {learning_goal}

Competencies to develop:
{competencies_text}

Create a JSON array of 8-15 learning concepts with their prerequisites.

REQUIREMENTS:
1. Each concept should be a specific, learnable unit
2. Prerequisites should form a logical learning sequence
3. Foundational concepts have empty prerequisite arrays
4. Advanced concepts build on earlier ones
5. Cover all competencies mentioned above
6. Order concepts from foundational to advanced

OUTPUT FORMAT (strict JSON array):
[
  {{"concept": "ConceptName1", "prerequisites": []}},
  {{"concept": "ConceptName2", "prerequisites": ["ConceptName1"]}},
  {{"concept": "ConceptName3", "prerequisites": ["ConceptName1", "ConceptName2"]}}
]

RULES:
- Use clear, descriptive concept names (2-4 words each)
- Each concept should take 1-3 hours to learn
- Ensure no circular dependencies
- Every advanced concept should have at least one prerequisite
- Return ONLY the JSON array, no additional text"""),
])


# ===== Legacy Prompts (for backward compatibility) =====

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
2. The "concept" field contains the name of a learning concept
3. The "prerequisites" array lists concept names that must be learned first (empty array if none)
4. Foundational concepts have empty prerequisites arrays
5. Advanced concepts list all direct prerequisites by their exact concept names
6. Order concepts from foundational to advanced based on dependency chains
7. Return ONLY the JSON array - no markdown formatting, no backticks, no explanation text

EXAMPLE:
[{{"concept":"Variables","prerequisites":[]}},{{"concept":"Data Types","prerequisites":["Variables"]}},{{"concept":"Functions","prerequisites":["Variables","Data Types"]}}]
"""

assessment_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a personalized AI tutor. The learner wants to learn about {topic}. "
     "Ask 3-5 clarifying questions to understand their current knowledge level, background, and specific learning goals. "
     "Be concise and focused."),
    ("human", "hello"),
    MessagesPlaceholder(variable_name="messages"),
])

generation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an expert learning path designer. Based on the learner's profile and responses, create a comprehensive, well-structured learning path for {topic}. "
     "\n\n" + JSON_OUTPUT_FORMAT +
     "\n\nIMPORTANT INSTRUCTIONS:"
     "\n1. Analyze the learner's knowledge level from the conversation"
     "\n2. Design a learning path appropriate for their background"
     "\n3. Break down {topic} into clear, logical concepts"
     "\n4. Establish prerequisite relationships carefully - each concept should list ALL direct prerequisites"
     "\n5. Ensure foundational concepts come first (empty prerequisites)"
     "\n6. Create a progressive learning sequence from basics to advanced topics"
     "\n7. Output ONLY the JSON array as specified above, with no extra text"
     "\n\nYour response must contain ONLY the JSON array. Do not include any explanation, markdown formatting, or additional commentary."),
    MessagesPlaceholder(variable_name="messages"),
])
