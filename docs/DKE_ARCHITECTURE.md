# System Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATION                             │
│                    (LMS, Web App, API, etc.)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Call integration API
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ADAPTIVE LEARNING PIPELINE                         │
│               (dke_content_integration.py)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  run_assessment_and_recommend()                                     │
│    ├─ Orchestrates end-to-end flow                                 │
│    ├─ Manages data transformations                                  │
│    └─ Packages results                                              │
│                                                                      │
│  update_after_learning()                                            │
│    └─ Tracks progress over time                                    │
│                                                                      │
└───┬────────────────────────────────────────────┬───────────────────┘
    │                                            │
    │ 1. Run DKE Assessment                      │ 2. Translate & Discover
    ▼                                            ▼
┌─────────────────────────┐          ┌──────────────────────────────┐
│   DKE SYSTEM            │          │   DKE CONTENT ADAPTER        │
│   (dke.py)              │          │   (Translation Layer)        │
├─────────────────────────┤          ├──────────────────────────────┤
│                         │          │                              │
│ ┌─────────────────────┐ │          │ identify_learning_gaps()     │
│ │ CATEngine           │ │          │   ├─ Analyze mastery scores  │
│ │ - Item selection    │ │          │   ├─ Determine priorities    │
│ │ - IRT 2PL model     │ │──────────┼──→│   └─ Map to difficulties  │
│ │ - Ability estimate  │ │          │                              │
│ └─────────────────────┘ │          │ create_discovery_queries()   │
│                         │          │   ├─ Generate search strings  │
│ ┌─────────────────────┐ │          │   └─ Set time constraints   │
│ │ KnowledgeTracer     │ │          │                              │
│ │ - BKT per skill     │ │          │ estimate_study_time()        │
│ │ - Mastery tracking  │ │          │   └─ Calculate time needed   │
│ └─────────────────────┘ │          │                              │
│                         │          └────────┬─────────────────────┘
│ ┌─────────────────────┐ │                   │
│ │ LLMGrader           │ │                   │ 3. Search & Rank
│ │ - Rubric evaluation │ │                   ▼
│ │ - Fallback scoring  │ │          ┌──────────────────────────────┐
│ └─────────────────────┘ │          │   CONTENT DISCOVERY          │
│                         │          │   (Project.py)               │
│ ┌─────────────────────┐ │          ├──────────────────────────────┤
│ │ ConceptMapScorer    │ │          │                              │
│ │ - Edge validation   │ │          │ VectorDBManager              │
│ └─────────────────────┘ │          │   ├─ In-memory index         │
└─────────────────────────┘          │   ├─ BM25 search             │
                                      │   ├─ TF-IDF similarity       │
                                      │   └─ Hybrid scoring          │
                                      │                              │
                                      │ LearnoraContentDiscovery     │
                                      │   ├─ Personalization         │
                                      │   ├─ Filtering               │
                                      │   └─ Ranking                 │
                                      │                              │
                                      └────────┬─────────────────────┘
                                               │
                                               │ 4. Bundle Results
                                               ▼
                              ┌──────────────────────────────────────┐
                              │   RECOMMENDATION BUNDLE              │
                              ├──────────────────────────────────────┤
                              │                                      │
                              │ • assessment_summary                 │
                              │   - θ (ability)                      │
                              │   - mastery_scores                   │
                              │   - llm_scores                       │
                              │                                      │
                              │ • learning_gaps                      │
                              │   - skill, mastery, priority         │
                              │   - difficulty, time                 │
                              │                                      │
                              │ • recommended_content                │
                              │   - title, type, difficulty          │
                              │   - url, description                 │
                              │                                      │
                              │ • learning_path                      │
                              │   - ordered sequence                 │
                              │                                      │
                              │ • metadata                           │
                              │   - time estimates                   │
                              │   - next assessment trigger          │
                              │                                      │
                              └──────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          INPUT DATA                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User Assessment Inputs                    User Profile Data         │
│  ├─ Adaptive test responses                ├─ user_id               │
│  ├─ Free-text answer                       ├─ knowledge_areas       │
│  ├─ Self-assessment scores                 ├─ learning_goals        │
│  └─ Concept map connections                ├─ preferred_formats     │
│                                             ├─ available_time        │
│                                             └─ learning_style        │
└───────────────┬──────────────────────────────────────┬───────────────┘
                │                                      │
                ▼                                      │
┌───────────────────────────────────────────────┐     │
│         PHASE 1: ASSESSMENT                   │     │
├───────────────────────────────────────────────┤     │
│                                               │     │
│  1. Adaptive Testing (CAT)                    │     │
│     └─→ θ = 0.156 (SE: 0.312)               │     │
│                                               │     │
│  2. Knowledge Tracing (BKT)                   │     │
│     └─→ mastery = {                          │     │
│           "algebra": 0.374,                   │     │
│           "probability": 0.558,               │     │
│           "functions": 0.662                  │     │
│         }                                     │     │
│                                               │     │
│  3. LLM Evaluation                            │     │
│     └─→ llm_scores = {                       │     │
│           "accuracy": 0.67,                   │     │
│           "completeness": 0.45,               │     │
│           "consistency": 0.58                 │     │
│         }                                     │     │
│     └─→ overall = 0.583                      │     │
│                                               │     │
│  4. Concept Map Scoring                       │     │
│     └─→ score = 0.333 (2/6 edges correct)   │     │
│                                               │     │
└───────────────┬───────────────────────────────┘     │
                │                                      │
                ▼                                      │
┌───────────────────────────────────────────────┐     │
│       PHASE 2: GAP ANALYSIS                   │     │
├───────────────────────────────────────────────┤     │
│                                               │     │
│  Identify Low Mastery Skills                  │     │
│  └─→ algebra: 0.374 (< 0.4)    → HIGH        │     │
│  └─→ probability: 0.558 (< 0.6) → MEDIUM     │     │
│                                               │     │
│  Map to Difficulty Levels                     │     │
│  └─→ algebra: "beginner"                      │     │
│  └─→ probability: "intermediate"              │     │
│                                               │     │
│  Estimate Study Time                          │     │
│  └─→ algebra: 60 minutes                      │     │
│  └─→ probability: 45 minutes                  │     │
│                                               │     │
│  Output: Learning Gaps                        │     │
│  [                                            │     │
│    LearningGap(                              │     │
│      skill="algebra",                         │     │
│      mastery=0.374,                          │     │
│      priority="high",                        │     │
│      difficulty="beginner",                  │     │
│      time=60                                  │     │
│    ),                                         │     │
│    LearningGap(...)                          │     │
│  ]                                            │     │
│                                               │     │
└───────────────┬───────────────────────────────┘     │
                │                                      │
                ▼                                      │
┌───────────────────────────────────────────────┐     │
│    PHASE 3: QUERY GENERATION                  │     │
├───────────────────────────────────────────────┤     │
│                                               │     │
│  For each learning gap:                       │     │
│                                               │     │
│  Gap: algebra (beginner, 60 min)             │     │
│  └─→ Query: "algebra mathematics tutorial     │     │
│              beginner practice"               │     │
│  └─→ Filters: difficulty="beginner",         │     │
│               duration<=60                    │     │
│                                               │     │
│  Gap: probability (intermediate, 45 min)     │     │
│  └─→ Query: "probability statistics          │     │
│              intermediate practice"           │     │
│  └─→ Filters: difficulty="intermediate",     │     │
│               duration<=45                    │     │
│                                               │     │
└───────────────┬───────────────────────────────┘     │
                │                                      │
                ▼                                      ▼
┌─────────────────────────────────────────────────────────┐
│         PHASE 4: CONTENT DISCOVERY                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  For Query: "algebra mathematics tutorial..."            │
│                                                          │
│  1. Tokenize & Search                                   │
│     └─→ BM25 scores: {                                 │
│           "algebra-basics": 8.2,                        │
│           "algebra-practice": 7.5, ...                  │
│         }                                               │
│     └─→ TF-IDF scores: {                               │
│           "algebra-basics": 0.87,                       │
│           "algebra-practice": 0.81, ...                 │
│         }                                               │
│                                                          │
│  2. Hybrid Scoring (w=0.65)                             │
│     └─→ combined = 0.35×BM25 + 0.65×TF-IDF             │
│     └─→ scores: {                                       │
│           "algebra-basics": 0.892,                      │
│           "algebra-practice": 0.816, ...                │
│         }                                               │
│                                                          │
│  3. Filter by Difficulty & Duration                     │
│     └─→ Keep only: difficulty="beginner"               │
│                    duration <= 60                       │
│                                                          │
│  4. Personalize with User Profile                       │
│     └─→ Boost: preferred_formats=["video"]             │
│     └─→ Adjust: available_time=60                      │
│     └─→ Final scores: {                                │
│           "algebra-basics-video": 0.981,  ← boosted    │
│           "algebra-practice": 0.857, ...                │
│         }                                               │
│                                                          │
│  5. Rank & Return Top-K                                 │
│     └─→ Return top 3 per gap                           │
│                                                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│       PHASE 5: PATH PLANNING                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Combine results across all gaps                        │
│  Order by:                                              │
│    1. Gap priority (high → medium → low)               │
│    2. Prerequisites                                     │
│    3. Difficulty progression                            │
│                                                          │
│  Learning Path:                                         │
│    1. algebra-basics-video        (45 min, beginner)    │
│    2. algebra-practice-exercises  (60 min, beginner)    │
│    3. probability-intro           (40 min, intermediate)│
│                                                          │
│  Total time: 145 minutes                                │
│  Next assessment: after_completing_3_items              │
│                                                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│              FINAL OUTPUT                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  RecommendationBundle {                                 │
│    user_id: "student_001",                              │
│    assessment_summary: {                                │
│      theta: 0.156,                                      │
│      mastery_scores: {...},                             │
│      llm_overall: 0.583                                 │
│    },                                                    │
│    learning_gaps: [LearningGap(...), ...],             │
│    recommended_content: [                               │
│      {                                                   │
│        title: "Algebra Basics Video",                   │
│        type: "video",                                    │
│        difficulty: "beginner",                          │
│        duration: 45,                                     │
│        score: 0.981,                                     │
│        url: "https://..."                               │
│      },                                                  │
│      ...                                                 │
│    ],                                                    │
│    learning_path: [                                     │
│      "algebra-basics-video",                            │
│      "algebra-practice-exercises",                      │
│      "probability-intro"                                │
│    ],                                                    │
│    estimated_completion_time: 145,                      │
│    next_assessment_trigger: "after_completing_3_items"  │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Component Interaction Sequence

```
User → App → Pipeline → DKE → Assessment Results
                  ↓
                  └──→ Adapter → Learning Gaps
                           ↓
                           └──→ Discovery → Search Results
                                     ↓
                                     └──→ Pipeline → Recommendation Bundle → App → User
```

## Module Dependency Graph

```
YOUR_APPLICATION
    │
    └─── imports ─────→ dke_content_integration.py
                             │
                             ├─── imports ─────→ dke.py
                             │                      │
                             │                      ├─ DKEPipeline
                             │                      ├─ ItemBank, Item
                             │                      ├─ CATEngine
                             │                      ├─ KnowledgeTracer
                             │                      ├─ LLMGrader
                             │                      └─ ConceptMapScorer
                             │
                             └─── imports ─────→ Project.py
                                                    │
                                                    ├─ LearningContent
                                                    ├─ UserProfile
                                                    ├─ VectorDBManager
                                                    └─ LearnoraContentDiscovery
```

## File Structure Tree

```
c:\Users\imran\
│
├── Dynamic_Knowledge_Evaluation\           ← Your working directory
│   │
│   ├── dke.py                              ← DKE core (original)
│   │   ├─ DKEPipeline
│   │   ├─ CATEngine (IRT 2PL)
│   │   ├─ KnowledgeTracer (BKT)
│   │   └─ LLMGrader
│   │
│   ├── dke_content_integration.py          ← Integration layer ⭐
│   │   ├─ AdaptiveLearningPipeline
│   │   ├─ DKEContentAdapter
│   │   ├─ LearningGap
│   │   └─ RecommendationBundle
│   │
│   ├── example_custom_usage.py             ← Template for customization
│   │   └─ Complete working example
│   │
│   ├── setup_integration.ps1               ← Setup verification script
│   │
│   ├── README.md                           ← Quick start guide
│   ├── INTEGRATION_GUIDE.md                ← Comprehensive docs
│   ├── CHECKLIST.md                        ← Testing & deployment
│   ├── SUMMARY.md                          ← Architecture overview
│   ├── QUICK_REFERENCE.md                  ← API quick ref
│   └── ARCHITECTURE.md                     ← This file
│
└── content-discovery-system\               ← Clone from GitHub
    │
    ├── Project.py                          ← Content discovery core
    │   ├─ LearningContent
    │   ├─ UserProfile
    │   ├─ VectorDBManager
    │   └─ LearnoraContentDiscovery
    │
    ├── demo.py
    ├── quick_start.py
    ├── test_content_discovery.py
    └── README.md
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                             │
├─────────────────────────────────────────────────────────────┤
│  • No assessment data                                        │
│  • Unknown user abilities                                    │
│  • No learning history                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              DURING ASSESSMENT                               │
├─────────────────────────────────────────────────────────────┤
│  CATState:                                                   │
│    asked: [item_ids...]                                     │
│    responses: {item_id: 0/1}                                │
│    theta: updated after each response                       │
│    se: decreasing with each item                            │
│                                                              │
│  BKTState:                                                   │
│    mastery: {skill: probability}                            │
│    ↑ updated after each item                                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            ASSESSMENT COMPLETE                               │
├─────────────────────────────────────────────────────────────┤
│  DKEResult:                                                  │
│    theta: final ability estimate                            │
│    mastery: {skill: final_probability}                      │
│    llm_scores: {criterion: score}                           │
│    concept_map_score: 0-1                                   │
│    dashboard: {recommendations, stats}                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              GAP IDENTIFICATION                              │
├─────────────────────────────────────────────────────────────┤
│  Learning Gaps:                                              │
│    [{skill, mastery, priority, difficulty, time}, ...]      │
│                                                              │
│  Search Queries:                                             │
│    [(query_string, difficulty, time_budget), ...]           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│           RECOMMENDATIONS READY                              │
├─────────────────────────────────────────────────────────────┤
│  RecommendationBundle:                                       │
│    • Assessment summary                                      │
│    • Learning gaps (prioritized)                            │
│    • Recommended content (personalized)                     │
│    • Learning path (ordered)                                │
│    • Time estimates                                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│               USER LEARNING                                  │
├─────────────────────────────────────────────────────────────┤
│  • User completes recommended content                        │
│  • System tracks: content_ids, time_spent                   │
│  • Triggers: re-assessment after N items                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              RE-ASSESSMENT                                   │
├─────────────────────────────────────────────────────────────┤
│  • Repeat assessment with updated priors                     │
│  • Compare: old_mastery vs new_mastery                      │
│  • Measure: learning_gain = new - old                       │
│  • Adjust: recommendations based on progress                │
└────────────┬────────────────────────────────────────────────┘
             │
             └──── Feedback Loop ─────┐
                                       │
             ┌─────────────────────────┘
             ▼
        (Continue cycle...)
```

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Purpose**: Visual reference for system architecture and data flow
