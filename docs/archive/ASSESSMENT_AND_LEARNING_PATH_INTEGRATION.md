# 🎓 Assessment, Learning Path & Knowledge Graph Integration Guide

## Overview

Learnora implements a **comprehensive adaptive learning ecosystem** that continuously assesses users, updates their knowledge graphs, and evolves their learning paths based on interactions and performance. This document explains the complete integration workflow.

---

## 🔄 Complete Learning Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADAPTIVE LEARNING CYCLE                       │
└─────────────────────────────────────────────────────────────────┘

1. INITIAL ASSESSMENT (DKE)
   ↓
2. GAP ANALYSIS & PROFILING
   ↓
3. CONTENT DISCOVERY & PERSONALIZATION
   ↓
4. USER INTERACTION TRACKING
   ↓
5. PREFERENCE EVOLUTION (Auto-Learning)
   ↓
6. KNOWLEDGE GRAPH UPDATE
   ↓
7. LEARNING PATH ADJUSTMENT
   ↓
8. RE-ASSESSMENT (Loop back to 1)
```

---

## 📊 1. Assessment System (DKE Integration)

### **What is DKE?**
**Dynamic Knowledge Evaluation (DKE)** is a multi-modal assessment system that evaluates users through:

- 🤖 **LLM-Graded Free-Text Responses** - AI evaluates written answers using rubrics
- 🧠 **Concept Map Analysis** - Assesses understanding of relationships between concepts
- 📝 **Self-Assessment** - User's own evaluation of their understanding
- 📈 **Adaptive Testing (CAT)** - Computer Adaptive Testing with IRT (Item Response Theory)
- 🎯 **BKT (Bayesian Knowledge Tracing)** - Probabilistic mastery estimation per skill

### **Assessment Components**

#### **File**: `core-service/app/features/assessment/integration.py`

```python
class AdaptiveLearningPipeline:
    def run_assessment_and_recommend(
        self,
        user_id: str,
        response_free_text: str,      # User's written answer
        reference_text: str,           # Correct/ideal answer
        self_assess: SelfAssessment,   # User's self-evaluation
        concept_edges: List[Tuple],    # User's concept map
        required_edges: List[Tuple],   # Expected concept relationships
        oracle: Callable,              # Adaptive test simulator
        user_profile: UserProfile,
        context: Optional[str] = None
    ) -> RecommendationBundle:
```

### **Assessment Output Example**

```python
{
    "theta": -0.42,                    # IRT ability estimate (-3 to +3)
    "theta_se": 0.15,                  # Standard error of theta
    "mastery": {
        "python_basics": 0.35,         # 35% mastery - needs work!
        "data_structures": 0.68,       # 68% mastery - intermediate
        "algorithms": 0.22,            # 22% mastery - beginner
        "web_apis": 0.81              # 81% mastery - advanced
    },
    "llm_overall": 6.5,               # Overall quality score (0-10)
    "concept_map_score": 0.72,        # Concept understanding (0-1)
    "recommendations": [
        "Focus on python_basics fundamentals",
        "Practice algorithms with beginner content",
        "Continue building on data_structures knowledge"
    ]
}
```

---

## 🔍 2. Gap Analysis & Learning Recommendations

### **How Gaps are Identified**

The system analyzes assessment results to identify knowledge gaps:

```python
class DKEContentAdapter:
    def identify_learning_gaps(
        self, 
        dke_result: DKEResult
    ) -> List[LearningGap]:
```

### **Gap Prioritization Logic**

```python
# High Priority: mastery < 0.4 (below 40%)
# Medium Priority: mastery 0.4-0.6 (40-60%)
# Low Priority: mastery 0.6-0.8 (60-80%)
# No Gap: mastery > 0.8 (above 80%)
```

### **Learning Gap Example**

```python
LearningGap(
    skill="python_basics",
    mastery_level=0.35,                    # Current: 35%
    theta_estimate=-0.42,                  # IRT ability
    priority="high",                       # Needs immediate attention
    recommended_difficulty="beginner",      # Start with basics
    estimated_study_time=90,               # 90 minutes needed
    rationale="Current mastery at 35%. Recommended practice with beginner level content."
)
```

---

## 🎯 3. Content Discovery & Personalization

### **Automatic Content Recommendation**

Once gaps are identified, the system automatically discovers relevant content:

#### **File**: `core-service/app/features/assessment/integration.py`

```python
# Step 3: Generate content queries from gaps
queries = self.adapter.create_discovery_queries(learning_gaps, context)

# Example query generation:
# Gap: "python_basics" with beginner difficulty
# Query: "python basics tutorial practice exercises"
# Difficulty: "beginner"
# Time Budget: 90 minutes
```

#### **File**: `core-service/app/features/content_discovery/service.py`

```python
# Step 4: Discover and rank content
results = self.discovery.discover_and_personalize(
    query="python basics tutorial practice",
    user_profile=user_profile,
    strategy="hybrid",           # BM25 + Dense semantic search
    top_k=3,                     # Top 3 items per gap
    auto_discover=True           # Fetch from APIs if needed
)

# Content sources:
# - YouTube educational videos (5 per search)
# - Medium articles (5 per search)
# - GitHub tutorial repos (1-5 per search)
# - DuckDuckGo web results (5 per search)
# - Perplexity AI enhancement (quality + tags + difficulty)
```

### **Personalization Factors**

Content is ranked based on:

1. **Relevance Score** - BM25 + semantic similarity
2. **Difficulty Match** - Matches user's current mastery level
3. **Format Preference** - User prefers videos/articles/tutorials
4. **Time Budget** - Fits within available study time
5. **Knowledge Areas** - Builds on what user already knows
6. **Recent Interactions** - Learns from past engagement

---

## 📈 4. User Interaction Tracking

### **What Gets Tracked?**

Every user interaction with content is automatically captured:

#### **File**: `learner-web-app/src/features/content-discovery/ContentCard.tsx`

```typescript
const handleClick = async () => {
    await trackInteraction({
        content_id: content.id,
        interaction_type: 'clicked',           // clicked, viewed, completed
        content_title: "Python Tutorial",
        content_type: "video",                 // article, video, tutorial
        content_difficulty: "beginner",
        content_duration_minutes: 30,
        content_tags: ["python", "basics"],
        duration_seconds: 45,                  // How long user engaged
        completion_percentage: 0,              // 0-100%
        rating: null                           // Optional user rating
    });
};
```

#### **File**: `core-service/app/features/users/preference_service.py`

```python
class PreferenceService:
    def track_interaction(
        self, 
        user_id: int, 
        content_id: str,
        interaction_type: str,
        # ... all metadata
    ) -> ContentInteraction:
        """
        Saves interaction to database.
        If auto_evolve=True, triggers preference evolution!
        """
```

### **Database Storage**

**Table**: `content_interactions`

```sql
CREATE TABLE content_interactions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    content_id VARCHAR,
    content_title VARCHAR,
    content_type VARCHAR,              -- article, video, tutorial
    content_difficulty VARCHAR,         -- beginner, intermediate, advanced
    content_duration_minutes INTEGER,
    content_tags JSON,                  -- ["python", "web", "tutorial"]
    interaction_type VARCHAR,           -- clicked, viewed, completed
    duration_seconds INTEGER,           -- Time spent
    rating FLOAT,                       -- Optional 1-5 rating
    completion_percentage INTEGER,      -- 0-100
    timestamp TIMESTAMP
);
```

---

## 🧠 5. Auto-Evolving Preferences (Machine Learning)

### **How the System Learns**

The system automatically adapts to user behavior through preference evolution:

#### **File**: `core-service/app/features/users/preference_service.py`

```python
class PreferenceService:
    def _evolve_preferences(self, user_id: int) -> None:
        """
        AI that learns from user behavior!
        Analyzes last 30 days of interactions.
        """
        
        # Get recent interactions
        interactions = get_last_30_days_interactions(user_id)
        
        # Learn preferred formats
        # User clicks videos 70%, articles 30% → prefer videos
        format_scores = Counter()
        for interaction in interactions:
            weight = interaction_weight(interaction.type)
            format_scores[interaction.content_type] += weight
        
        # Update preferred_formats in database
        top_formats = format_scores.most_common(3)
        prefs.preferred_formats = [fmt for fmt, _ in top_formats]
        
        # Learn preferred difficulty
        # User completes 80% of intermediate, 20% advanced → intermediate
        difficulty_scores = Counter()
        for interaction in interactions:
            if interaction.completion_percentage > 50:
                difficulty_scores[interaction.content_difficulty] += 2
            else:
                difficulty_scores[interaction.content_difficulty] += 1
        
        prefs.preferred_difficulty = difficulty_scores.most_common(1)[0][0]
        
        # Extract knowledge areas from tags
        tag_scores = Counter()
        for interaction in interactions:
            for tag in interaction.content_tags:
                tag_scores[tag] += 1
        
        # Top 10 tags become knowledge areas
        top_tags = tag_scores.most_common(10)
        prefs.knowledge_areas = {
            tag: "learning" for tag, _ in top_tags
        }
        
        # Calculate average time spent
        total_duration = sum(i.duration_seconds for i in interactions)
        avg_daily_time = total_duration / 30  # 30 days
        prefs.available_time_daily = int(avg_daily_time / 60)  # Convert to minutes
```

### **Preference Evolution Example**

**Before Interactions:**
```python
{
    "preferred_formats": [],
    "learning_style": "balanced",
    "available_time_daily": 60,
    "knowledge_areas": {},
    "preferred_difficulty": "intermediate",
    "auto_evolve": True
}
```

**After 20 Interactions (15 videos, 5 articles):**
```python
{
    "preferred_formats": ["video", "article"],      # Learned from behavior!
    "learning_style": "visual",                     # Detected from video preference
    "available_time_daily": 45,                     # Average session length
    "knowledge_areas": {                            # Auto-discovered from tags
        "python": "learning",
        "web_development": "learning",
        "javascript": "learning",
        "tutorial": "learning"
    },
    "preferred_difficulty": "intermediate",          # 80% completion rate
    "auto_evolve": True
}
```

---

## 🗺️ 6. Knowledge Graph Update

### **What is the Knowledge Graph?**

The Knowledge Graph (KG) stores semantic relationships between:
- **Users** - Individual learners
- **Concepts** - Topics, skills, subjects
- **Learning Paths** - Ordered sequences of concepts
- **Prerequisites** - Concept dependencies
- **User Knowledge** - Mastery levels per concept

### **Technology**: RDFLib (Resource Description Framework)

#### **File**: `core-service/app/features/users/knowledge/storage.py`

```python
class UserKnowledgeStorage:
    def save_concept_knowledge(
        self,
        user_id: str,
        concept_id: str,
        mastery: float,           # 0.0 to 1.0
        score: Optional[float]    # Optional numerical score
    ) -> Dict:
        """
        Updates user's knowledge graph with new mastery level.
        """
        
        # Load user's RDF graph
        user_graph = self.kg_storage.load_user_graph(user_id)
        
        # Create/update concept knowledge triple
        # Triple: (User, hasKnowledgeOf, Concept)
        user_uri = URIRef(f"{LEARNORA_NS}user/{user_id}")
        concept_uri = URIRef(f"{LEARNORA_NS}concept/{concept_id}")
        
        # Add mastery metadata
        knowledge_node = BNode()
        user_graph.add((user_uri, ONTO.hasKnowledgeOf, knowledge_node))
        user_graph.add((knowledge_node, ONTO.concept, concept_uri))
        user_graph.add((knowledge_node, ONTO.masteryLevel, Literal(mastery)))
        user_graph.add((knowledge_node, ONTO.lastUpdated, Literal(datetime.now())))
        
        # Save updated graph
        self.kg_storage.save_user_graph(user_id, user_graph)
```

### **Knowledge Graph Structure**

```turtle
# RDF Triples (Subject-Predicate-Object)

# User has knowledge of Python
<learnora:user/user123> 
    <learnora:hasKnowledgeOf> [
        <learnora:concept> <learnora:concept/python_basics> ;
        <learnora:masteryLevel> "0.72"^^xsd:float ;
        <learnora:lastUpdated> "2025-11-03T10:30:00"^^xsd:dateTime
    ] .

# User has knowledge of Data Structures
<learnora:user/user123> 
    <learnora:hasKnowledgeOf> [
        <learnora:concept> <learnora:concept/data_structures> ;
        <learnora:masteryLevel> "0.58"^^xsd:float ;
        <learnora:lastUpdated> "2025-11-03T10:30:00"^^xsd:dateTime
    ] .

# Concept prerequisites (Python → Data Structures)
<learnora:concept/data_structures> 
    <learnora:requires> <learnora:concept/python_basics> .
```

### **When Knowledge Graph Gets Updated**

1. **After Assessment** - DKE results update mastery levels
2. **After Content Interaction** - Inferred mastery from engagement
3. **Manual User Input** - Explicit knowledge declarations
4. **Learning Path Progress** - Completing concepts

#### **File**: `core-service/app/features/users/knowledge/service.py`

```python
class UserKnowledgeService:
    async def update_user_knowledge_item(
        self,
        user_id: str,
        concept_id: str,
        mastery: float,
        score: Optional[float] = None
    ) -> Dict:
        """
        Updates user knowledge after:
        - Assessment completion
        - Content interaction
        - Learning milestone achievement
        """
```

---

## 🛤️ 7. Learning Path Adjustment

### **Dynamic Path Evolution**

Learning paths are **not static** - they evolve based on:

1. **Assessment Results** - Add/remove concepts based on gaps
2. **User Progress** - Reorder based on completed concepts
3. **Prerequisite Violations** - Ensure proper sequencing
4. **Time Constraints** - Adjust for available study time
5. **Interest Signals** - Prioritize topics user engages with

#### **File**: `core-service/app/features/learning_path/service.py`

```python
class LearningPathService:
    def create_learning_path_kg(
        self,
        user_id: str,
        thread_id: str,
        topic: str,
        concept_ids: list[str]
    ) -> URIRef:
        """
        Creates learning path in Knowledge Graph.
        Path structure:
        - User owns path
        - Path contains ordered concepts
        - Concepts have prerequisites
        - Progress tracked per concept
        """
```

### **Learning Path in Knowledge Graph**

```turtle
# Learning Path structure
<learnora:learning_path/thread_456>
    a <learnora:LearningPath> ;
    <learnora:belongsTo> <learnora:user/user123> ;
    <learnora:topic> "Full Stack Web Development" ;
    <learnora:createdAt> "2025-11-03T10:00:00"^^xsd:dateTime .

# Path contains concepts in order
<learnora:learning_path/thread_456>
    <learnora:hasConcept> [
        <learnora:concept> <learnora:concept/html_basics> ;
        <learnora:order> 1 ;
        <learnora:status> "completed"
    ] ;
    <learnora:hasConcept> [
        <learnora:concept> <learnora:concept/css_styling> ;
        <learnora:order> 2 ;
        <learnora:status> "in_progress"
    ] ;
    <learnora:hasConcept> [
        <learnora:concept> <learnora:concept/javascript> ;
        <learnora:order> 3 ;
        <learnora:status> "not_started"
    ] .
```

### **Path Adjustment Triggers**

```python
# Trigger 1: Assessment reveals new gap
if assessment_result.mastery["react"] < 0.4:
    learning_path.add_concept("react_basics", position=4)
    learning_path.reorder_based_on_prerequisites()

# Trigger 2: User completes concept ahead of schedule
if user_completed("css_styling"):
    learning_path.mark_complete("css_styling")
    learning_path.unlock_next_concepts()

# Trigger 3: User struggles with concept
if user_interactions.avg_completion < 30%:
    learning_path.add_prerequisite_review("html_basics")
    learning_path.lower_difficulty()

# Trigger 4: User shows interest in advanced topic
if user_clicks.count("advanced_react") > 5:
    learning_path.add_optional_concept("advanced_react")
```

---

## 🔁 8. Re-Assessment & Continuous Improvement

### **When to Re-Assess?**

The system determines re-assessment timing based on:

#### **File**: `core-service/app/features/assessment/integration.py`

```python
# Determine when to re-assess
if dke_result.theta < -0.3 or any(gap.priority == "high" for gap in learning_gaps):
    next_trigger = "after_completing_3_items"  # Quick re-check
else:
    next_trigger = "weekly"                     # Regular check

# Other triggers:
# - "after_learning_path_milestone" 
# - "on_user_request"
# - "monthly"
```

### **Re-Assessment Workflow**

```python
# Step 1: User completes 3 content items
content_completed = ["video_1", "article_2", "tutorial_3"]

# Step 2: System triggers mini-assessment
mini_assessment = run_adaptive_test(
    user_id=user_id,
    focus_skills=["python_basics"],  # Only re-test improved skills
    num_items=5                       # Shorter assessment
)

# Step 3: Update knowledge graph with new mastery
for skill, mastery in mini_assessment.mastery.items():
    update_user_knowledge(user_id, skill, mastery)

# Step 4: Adjust learning path if needed
if mastery["python_basics"] > 0.8:
    learning_path.mark_complete("python_basics")
    learning_path.unlock_next_concepts()
else:
    learning_path.add_more_practice("python_basics")
```

---

## 🎯 Complete Integration Example

### **Scenario: New User "Alice" Learns Web Development**

#### **Day 1 - Initial Assessment**

```python
# 1. Alice takes initial assessment
assessment_result = dke_pipeline.run(
    response_free_text="HTML is markup language for websites...",
    reference_text="HTML is a markup language...",
    self_assess=SelfAssessment(confidence=3, clarity=4),
    concept_edges=[("HTML", "CSS"), ("CSS", "Styling")],
    required_edges=[("HTML", "Structure"), ("CSS", "Styling")],
    oracle=alice_adaptive_test_oracle
)

# Results:
# {
#   "mastery": {
#     "html_basics": 0.65,      # OK
#     "css_styling": 0.42,      # Needs work
#     "javascript": 0.18,       # Beginner
#     "react": 0.05             # No knowledge
#   }
# }
```

#### **Day 1 - Gap Analysis & Content Discovery**

```python
# 2. System identifies gaps
gaps = [
    LearningGap(skill="css_styling", priority="high", difficulty="beginner"),
    LearningGap(skill="javascript", priority="high", difficulty="beginner"),
    LearningGap(skill="react", priority="medium", difficulty="beginner")
]

# 3. Auto-discover content for each gap
content_recommendations = discovery.discover_and_personalize(
    query="css styling tutorial beginner",
    user_profile=alice_profile,
    strategy="hybrid",
    auto_discover=True
)

# Returns:
# - 5 YouTube CSS tutorials
# - 3 Medium CSS articles
# - 2 FreeCodeCamp CSS exercises
# - All ranked by: relevance + difficulty match + format preference
```

#### **Day 1-7 - Alice Interacts with Content**

```python
# 4. Alice watches videos and reads articles
interactions = [
    {"content_id": "css_video_1", "type": "clicked", "duration": 480, "completion": 90},
    {"content_id": "css_article_1", "type": "clicked", "duration": 300, "completion": 100},
    {"content_id": "css_video_2", "type": "clicked", "duration": 600, "completion": 75},
    {"content_id": "js_tutorial_1", "type": "clicked", "duration": 900, "completion": 50},
]

# Each interaction tracked automatically!
```

#### **Day 7 - Preference Evolution**

```python
# 5. System learns Alice's preferences
evolved_preferences = {
    "preferred_formats": ["video", "article"],  # She likes both!
    "available_time_daily": 52,                 # Avg 52 min/day
    "knowledge_areas": {                        # Auto-discovered
        "css": "learning",
        "html": "learning",
        "javascript": "learning",
        "web_design": "learning"
    },
    "preferred_difficulty": "beginner",         # 75%+ completion rate
    "learning_style": "visual"                  # Prefers videos
}
```

#### **Day 7 - Knowledge Graph Update**

```python
# 6. Update Alice's knowledge graph
update_user_knowledge("alice", "css_styling", mastery=0.68)  # Improved!
update_user_knowledge("alice", "javascript", mastery=0.32)   # Some progress
update_user_knowledge("alice", "html_basics", mastery=0.72)  # Maintaining

# Graph now shows:
# Alice --hasKnowledgeOf--> [CSS: 0.68, JS: 0.32, HTML: 0.72]
```

#### **Day 7 - Learning Path Creation**

```python
# 7. Create personalized learning path
learning_path = create_learning_path(
    user_id="alice",
    topic="Full Stack Web Development",
    concepts=[
        "html_basics",       # Already know (0.72)
        "css_styling",       # In progress (0.68)
        "javascript",        # Learning (0.32)
        "react",            # Future (0.05)
        "nodejs",           # Future (0.0)
        "databases"         # Future (0.0)
    ]
)

# Path stored in Knowledge Graph with prerequisites
```

#### **Day 14 - Re-Assessment**

```python
# 8. After 2 weeks, re-assess CSS mastery
mini_assessment = run_adaptive_test(
    user_id="alice",
    focus_skills=["css_styling"],
    num_items=5
)

# New mastery: 0.82! 

# 9. Update learning path
if mini_assessment.mastery["css_styling"] > 0.8:
    learning_path.mark_complete("css_styling")
    learning_path.unlock_next("javascript")
    
    # Discover JavaScript content
    js_content = discovery.discover_and_personalize(
        query="javascript tutorial beginner",
        user_profile=alice_updated_profile,
        auto_discover=True
    )
```

---

## 🔧 Technical Architecture

### **System Components**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - ContentDiscovery.tsx (Search & Discovery)            │
│  - ContentCard.tsx (Interaction Tracking)               │
│  - PreferencesSettings.tsx (View Preferences)           │
│  - AssessmentView.tsx (Take Assessments)                │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────┐
│                  BACKEND (FastAPI)                       │
│  - Content Discovery Service                            │
│  - Assessment Service (DKE)                             │
│  - Preference Service (ML)                              │
│  - Learning Path Service                                │
│  - User Knowledge Service                               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────┐         ┌────────▼─────────┐
│   SQLite DB  │         │  Knowledge Graph │
│              │         │     (RDFLib)     │
│ - Users      │         │                  │
│ - Interactions│        │ - User Graphs    │
│ - Preferences │        │ - Concept Graphs │
│ - Assessments│         │ - Path Graphs    │
└──────────────┘         └──────────────────┘
```

### **Data Flow**

```
USER ACTION → TRACKING → PREFERENCE EVOLUTION → KG UPDATE → PATH ADJUSTMENT

Example:
User clicks video → 
    Save interaction to DB → 
        Analyze last 30 days → 
            Update preferred_formats to ["video"] → 
                Update KG: User prefers visual learning → 
                    Adjust learning path to include more videos →
                        Discover new video content →
                            Rank videos higher in search →
                                User sees better recommendations!
```

---

## 📊 Metrics & Analytics

### **What Can Be Tracked?**

1. **User Progress Metrics**
   - Total interactions
   - Completion rates
   - Average session duration
   - Content types engaged with
   - Difficulty levels attempted

2. **Knowledge Metrics**
   - Mastery levels per concept
   - Learning velocity (mastery improvement rate)
   - Prerequisite completion
   - Skill gaps identified

3. **System Performance**
   - Content recommendation accuracy
   - Assessment prediction accuracy (IRT theta vs actual performance)
   - Preference evolution accuracy
   - Learning path completion rates

4. **Engagement Metrics**
   - Daily active users
   - Content discovery usage
   - Assessment completion rates
   - Re-assessment intervals

---

## 🚀 Getting Started

### **1. Enable Assessment System**

```python
# backend: core-service/app/features/assessment/router.py
# Endpoints available:
POST /api/v1/assessment/run
POST /api/v1/assessment/adaptive-test
GET /api/v1/assessment/results/{user_id}
```

### **2. Enable Auto-Evolving Preferences**

```python
# Already enabled by default!
# To disable:
PUT /api/v1/preferences
{
  "auto_evolve": false
}
```

### **3. View Your Knowledge Graph**

```python
# frontend: Navigate to /knowledge-graph
# Shows visual representation of:
# - Your concepts and mastery levels
# - Learning path progress
# - Prerequisite relationships
```

### **4. Take an Assessment**

```python
# frontend: Navigate to /assessment
# Complete multi-modal assessment:
# 1. Free-text response
# 2. Concept map drawing
# 3. Self-assessment
# 4. Adaptive test (5-10 questions)
```

### **5. See Recommendations**

```python
# After assessment, system automatically:
# 1. Identifies your gaps
# 2. Discovers relevant content
# 3. Creates personalized learning path
# 4. Updates knowledge graph
# 5. Tracks your progress
```

---

## 🎯 Best Practices

### **For Learners**

1. ✅ **Take Initial Assessment** - Let system understand your baseline
2. ✅ **Enable Auto-Evolve** - Let AI learn your preferences
3. ✅ **Interact Naturally** - Click, read, watch what interests you
4. ✅ **Complete Content** - High completion rates improve recommendations
5. ✅ **Re-Assess Regularly** - Update mastery levels as you learn

### **For Developers**

1. ✅ **Track Everything** - More data = better recommendations
2. ✅ **Update KG Frequently** - Keep knowledge graph in sync
3. ✅ **Validate Assessments** - Ensure DKE results are accurate
4. ✅ **Monitor Preference Evolution** - Check if learning is working
5. ✅ **Adjust Path Logic** - Fine-tune path adjustment triggers

---

## 📝 Summary

### **The Complete Cycle**

1. **ASSESS** → User takes DKE multi-modal assessment
2. **ANALYZE** → System identifies knowledge gaps and priorities
3. **DISCOVER** → Auto-fetch content from 5+ sources (YouTube, Medium, GitHub, etc.)
4. **PERSONALIZE** → Rank content by relevance + difficulty + format + time
5. **TRACK** → Monitor every click, view, completion
6. **EVOLVE** → AI learns preferences from behavior (30-day window)
7. **UPDATE KG** → Store mastery levels in semantic knowledge graph
8. **ADJUST PATH** → Reorder concepts based on progress
9. **RE-ASSESS** → Trigger new assessment based on triggers
10. **LOOP** → Continuous improvement!

### **Key Files Reference**

| Component | File Path |
|-----------|-----------|
| **Assessment** | `core-service/app/features/assessment/integration.py` |
| **Gap Analysis** | `core-service/app/features/assessment/integration.py` (DKEContentAdapter) |
| **Content Discovery** | `core-service/app/features/content_discovery/service.py` |
| **Interaction Tracking** | `learner-web-app/src/features/content-discovery/ContentCard.tsx` |
| **Preference Evolution** | `core-service/app/features/users/preference_service.py` |
| **Knowledge Graph** | `core-service/app/features/users/knowledge/storage.py` |
| **Learning Paths** | `core-service/app/features/learning_path/service.py` |

---

**🎓 Learnora: Adaptive Learning Powered by AI, Knowledge Graphs & Multi-Modal Assessment! 🚀**
