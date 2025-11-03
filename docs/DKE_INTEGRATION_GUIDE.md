# DKE + Content Discovery System Integration Guide

## Overview

This guide explains how to integrate the **Dynamic Knowledge Evaluation (DKE)** system with the **Content Discovery System** to create a complete adaptive learning platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Adaptive Learning Pipeline                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐  │
│  │  DKE System  │      │  Integration │      │  Content  │  │
│  │              │─────→│    Adapter   │─────→│ Discovery │  │
│  │ - CAT/IRT    │      │              │      │  System   │  │
│  │ - BKT        │      │ - Gap ID     │      │           │  │
│  │ - LLM Eval   │      │ - Query Gen  │      │ - Search  │  │
│  │ - Concept Map│      │ - Priority   │      │ - Rank    │  │
│  └──────────────┘      └──────────────┘      └───────────┘  │
│         │                      │                     │        │
│         └──────────────────────┴─────────────────────┘        │
│                               │                               │
│                    ┌──────────▼──────────┐                    │
│                    │  Recommendations    │                    │
│                    │  - Content Items    │                    │
│                    │  - Learning Path    │                    │
│                    │  - Time Estimates   │                    │
│                    └─────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### 1. **DKE System** (`dke.py`)
Performs comprehensive knowledge assessment through:
- **Adaptive Testing (CAT)**: Item Response Theory (IRT) based adaptive test selection
- **Knowledge Tracing (BKT)**: Bayesian Knowledge Tracing per skill
- **LLM-powered Analysis**: AI grading with rubric-based fallback
- **Multi-modal Assessment**: Quizzes, self-assessment, concept mapping

**Output**: Ability estimates (θ), mastery probabilities, learning recommendations

### 2. **Content Discovery System** (from GitHub repo)
Provides content search and recommendation:
- **Vector DB**: In-memory TF-IDF + BM25 search engine
- **Personalization**: User profile-based ranking adjustments
- **Content Metadata**: Difficulty, duration, format, prerequisites

**Output**: Ranked learning content tailored to user needs

### 3. **Integration Layer** (`dke_content_integration.py`)
Connects the two systems:
- **Gap Analysis**: Converts DKE mastery scores into learning gaps
- **Query Generation**: Creates content search queries from gaps
- **Recommendation Bundling**: Packages assessment + content recommendations
- **Feedback Loop**: Tracks learning progress and triggers re-assessment

## Installation & Setup

### Step 1: Set Up the Workspace

```powershell
# Your current workspace
cd c:\Users\imran\Dynamic_Knowledge_Evaluation

# Clone the content discovery system
cd ..
git clone https://github.com/imranulf/content-discovery-system
```

### Step 2: Verify File Structure

```
c:\Users\imran\
├── Dynamic_Knowledge_Evaluation\
│   ├── dke.py                          # DKE core system
│   ├── dke_content_integration.py      # Integration module (NEW)
│   ├── INTEGRATION_GUIDE.md            # This guide (NEW)
│   └── README.md                       # Integration README (NEW)
└── content-discovery-system\
    ├── Project.py                      # Content discovery core
    ├── README.md
    └── ... other files
```

### Step 3: Update Python Path (if needed)

Create a simple startup script or modify the integration file:

**Option A: Add to integration file (already done)**
```python
import sys
sys.path.insert(0, r'c:\Users\imran\content-discovery-system')
```

**Option B: Set environment variable**
```powershell
$env:PYTHONPATH = "c:\Users\imran\content-discovery-system;$env:PYTHONPATH"
```

### Step 4: Install Dependencies

```powershell
# Both systems use minimal dependencies
pip install numpy pandas

# Optional: for enhanced features
pip install redis  # if using Redis caching
```

## Usage Examples

### Example 1: Basic Integration Demo

```powershell
cd c:\Users\imran\Dynamic_Knowledge_Evaluation
python dke_content_integration.py
```

This runs a complete demo showing:
1. Adaptive assessment of a simulated student
2. Gap identification based on mastery scores
3. Content recommendations aligned with gaps
4. Learning path generation

### Example 2: Programmatic Usage

```python
from dke import DKEPipeline, CATConfig, BKTParams, SelfAssessment
from dke_content_integration import AdaptiveLearningPipeline
from Project import UserProfile

# 1. Initialize DKE pipeline
from dke import _build_demo_bank

bank, skills = _build_demo_bank()
dke = DKEPipeline(
    bank=bank,
    cat_cfg=CATConfig(max_items=12, se_stop=0.32),
    skills=skills,
    bkt_params=BKTParams(p_init=0.3, p_transit=0.25)
)

# 2. Create integrated pipeline
pipeline = AdaptiveLearningPipeline(dke_pipeline=dke)

# 3. Set up user profile
user_profile = UserProfile(
    user_id="student_123",
    knowledge_areas={"algebra": "beginner"},
    learning_goals=["master algebra"],
    preferred_formats=["video", "article"],
    available_time_daily=60,
    learning_style="visual"
)

# 4. Prepare assessment inputs
self_assess = SelfAssessment(
    confidence={"algebra": 2, "probability": 3, "functions": 3}
)

# 5. Run assessment and get recommendations
bundle = pipeline.run_assessment_and_recommend(
    user_id="student_123",
    response_free_text="[student's answer text]",
    reference_text="[ideal answer text]",
    self_assess=self_assess,
    concept_edges=[("var", "equation")],
    required_edges=[("var", "equation"), ("equation", "solution")],
    oracle=oracle_function,  # Your answer simulation function
    user_profile=user_profile,
    context="mathematics"
)

# 6. Access results
print(f"Ability: {bundle.assessment_summary['theta']}")
print(f"Gaps: {len(bundle.learning_gaps)}")
print(f"Recommendations: {len(bundle.recommended_content)}")

for gap in bundle.learning_gaps:
    print(f"- {gap.skill}: {gap.mastery_level:.1%} mastery")
    
for content in bundle.recommended_content:
    print(f"- {content['title']} ({content['difficulty']})")
```

### Example 3: Custom Content Integration

```python
# Add your own learning content
from Project import LearningContent
from datetime import datetime

custom_content = [
    LearningContent(
        id="algebra-101",
        title="Algebra Fundamentals",
        content_type="course",
        source="internal",
        url="https://learning.example.com/algebra-101",
        description="Complete introduction to algebra with practice problems",
        difficulty="beginner",
        duration_minutes=45,
        tags=["algebra", "mathematics", "basics"],
        prerequisites=[],
        created_at=datetime.utcnow()
    ),
    # Add more content...
]

# Add to discovery system
pipeline.discovery.vector_db.add_contents(custom_content)

# Now run assessments - your content will be recommended!
```

## Integration Data Flow

### 1. Assessment Phase
```python
Input:
  - User responses (adaptive test items)
  - Free-text answer
  - Self-assessment scores
  - Concept map drawing

↓ DKE Processing

Output:
  - θ (ability estimate): e.g., 0.23
  - Mastery scores: {"algebra": 0.35, "probability": 0.58}
  - LLM scores: {"accuracy": 0.67, "completeness": 0.45}
```

### 2. Gap Identification Phase
```python
Input: DKE Results

↓ Adapter Processing

Output: Learning Gaps
  [
    LearningGap(
      skill="algebra",
      mastery_level=0.35,
      priority="high",
      recommended_difficulty="beginner",
      estimated_study_time=60
    ),
    ...
  ]
```

### 3. Content Discovery Phase
```python
Input: Learning Gaps + User Profile

↓ Query Generation
  queries = [
    ("algebra mathematics tutorial", "beginner", 60),
    ("probability basics practice", "intermediate", 45)
  ]

↓ Content Search (BM25 + TF-IDF)

Output: Ranked Content
  [
    {"title": "Algebra 101", "score": 0.89, "difficulty": "beginner"},
    ...
  ]
```

### 4. Recommendation Phase
```python
Output: RecommendationBundle
  - assessment_summary (θ, mastery, scores)
  - learning_gaps (prioritized list)
  - recommended_content (matched & ranked)
  - learning_path (suggested sequence)
  - estimated_completion_time (minutes)
  - next_assessment_trigger (when to re-assess)
```

## API Reference

### `AdaptiveLearningPipeline`

Main integration class.

**Constructor**:
```python
pipeline = AdaptiveLearningPipeline(
    dke_pipeline: Optional[DKEPipeline] = None,
    content_discovery: Optional[LearnoraContentDiscovery] = None,
    adapter: Optional[DKEContentAdapter] = None
)
```

**Methods**:

#### `run_assessment_and_recommend()`
Complete pipeline: assessment → analysis → recommendations

```python
bundle = pipeline.run_assessment_and_recommend(
    user_id: str,
    response_free_text: str,
    reference_text: str,
    self_assess: SelfAssessment,
    concept_edges: List[Tuple[str, str]],
    required_edges: List[Tuple[str, str]],
    oracle: Callable[[Item], int],
    user_profile: Optional[UserProfile] = None,
    context: Optional[str] = None
) -> RecommendationBundle
```

#### `update_after_learning()`
Track progress after completing recommended content

```python
progress = pipeline.update_after_learning(
    user_id: str,
    completed_content_ids: List[str],
    learning_time_minutes: int,
    oracle: Callable[[Item], int]
) -> Dict[str, Any]
```

### `DKEContentAdapter`

Utility class for translating between DKE and Content Discovery.

**Static Methods**:
- `map_mastery_to_difficulty(mastery: float) -> str`
- `map_theta_to_difficulty(theta: float) -> str`
- `prioritize_gaps(mastery: Dict, llm_scores: Dict) -> List[str]`
- `estimate_study_time(mastery: float, skill: str) -> int`

**Instance Methods**:
- `identify_learning_gaps(dke_result: DKEResult) -> List[LearningGap]`
- `create_discovery_queries(gaps: List[LearningGap]) -> List[Tuple]`

### Data Classes

#### `LearningGap`
```python
@dataclass
class LearningGap:
    skill: str
    mastery_level: float  # 0.0 to 1.0
    theta_estimate: float
    priority: str  # "high", "medium", "low"
    recommended_difficulty: str
    estimated_study_time: int  # minutes
    rationale: str
```

#### `RecommendationBundle`
```python
@dataclass
class RecommendationBundle:
    user_id: str
    assessment_summary: Dict[str, Any]
    learning_gaps: List[LearningGap]
    recommended_content: List[Dict[str, Any]]
    learning_path: List[str]
    estimated_completion_time: int
    next_assessment_trigger: str
    created_at: datetime
```

## Customization Guide

### 1. Custom Difficulty Mapping

Adjust how mastery translates to content difficulty:

```python
from dke_content_integration import DKEContentAdapter

class CustomAdapter(DKEContentAdapter):
    @staticmethod
    def map_mastery_to_difficulty(mastery: float) -> str:
        # Your custom logic
        if mastery < 0.3:
            return "elementary"
        elif mastery < 0.5:
            return "beginner"
        elif mastery < 0.7:
            return "intermediate"
        else:
            return "advanced"
```

### 2. Custom Gap Prioritization

Change how gaps are prioritized:

```python
class CustomAdapter(DKEContentAdapter):
    @staticmethod
    def prioritize_gaps(mastery, llm_scores):
        # Combine multiple signals
        priorities = []
        for skill, m_score in mastery.items():
            # Factor in LLM scores
            llm_factor = llm_scores.get(skill, 0.5)
            combined_score = 0.7 * m_score + 0.3 * llm_factor
            
            if combined_score < 0.4:
                priorities.append((skill, "critical", combined_score))
            # ... more logic
        return priorities
```

### 3. Custom Study Time Estimation

```python
class CustomAdapter(DKEContentAdapter):
    @staticmethod
    def estimate_study_time(mastery, skill):
        # Base time per skill
        skill_complexity = {
            "algebra": 50,
            "calculus": 80,
            "statistics": 60
        }
        base = skill_complexity.get(skill, 45)
        
        # Adjust by mastery gap
        gap = 1.0 - mastery
        return int(base * gap * 1.5)
```

### 4. Add Custom Content Sources

```python
from Project import LearningContent

def load_my_content_library() -> List[LearningContent]:
    # Load from database, API, files, etc.
    return [
        LearningContent(
            id="custom-1",
            title="My Custom Course",
            # ... fields
        ),
        # ...
    ]

# Add to pipeline
pipeline.discovery.vector_db.add_contents(load_my_content_library())
```

## Advanced Features

### Feedback Loop Implementation

Track learning over time and adapt:

```python
# After student completes content
progress = pipeline.update_after_learning(
    user_id="student_123",
    completed_content_ids=["algebra-101", "algebra-practice"],
    learning_time_minutes=90,
    oracle=oracle_function
)

# Trigger re-assessment after threshold
if len(completed_ids) >= 3:
    new_bundle = pipeline.run_assessment_and_recommend(...)
    # Compare mastery improvement
    old_mastery = previous_bundle.assessment_summary['mastery_scores']
    new_mastery = new_bundle.assessment_summary['mastery_scores']
    
    for skill in old_mastery:
        improvement = new_mastery[skill] - old_mastery[skill]
        print(f"{skill}: +{improvement:.1%}")
```

### Multi-User Cohort Analysis

```python
cohort_results = []

for user in user_cohort:
    bundle = pipeline.run_assessment_and_recommend(
        user_id=user.id,
        # ... other params
    )
    cohort_results.append(bundle)

# Analyze cohort
avg_theta = np.mean([b.assessment_summary['theta'] for b in cohort_results])
common_gaps = find_common_gaps(cohort_results)

print(f"Cohort average ability: {avg_theta:.2f}")
print(f"Common struggles: {common_gaps}")
```

### Integration with LMS/External Systems

```python
# Export recommendations to JSON for external systems
import json

def export_recommendations(bundle: RecommendationBundle) -> str:
    export_data = {
        "user_id": bundle.user_id,
        "timestamp": bundle.created_at.isoformat(),
        "assessment": bundle.assessment_summary,
        "gaps": [
            {
                "skill": g.skill,
                "priority": g.priority,
                "mastery": g.mastery_level
            } for g in bundle.learning_gaps
        ],
        "recommendations": bundle.recommended_content,
        "learning_path": bundle.learning_path
    }
    return json.dumps(export_data, indent=2)

# Use in LMS webhook
json_data = export_recommendations(bundle)
# POST to LMS API...
```

## Troubleshooting

### Issue: Module Import Errors

**Problem**: `ImportError: No module named 'Project'`

**Solution**:
```powershell
# Check if repo is cloned
cd c:\Users\imran\content-discovery-system
dir Project.py  # Should exist

# Update Python path in script or environment
$env:PYTHONPATH = "c:\Users\imran\content-discovery-system;$env:PYTHONPATH"
```

### Issue: Empty Recommendations

**Problem**: `bundle.recommended_content` is empty

**Solution**:
```python
# Check if content is loaded
print(len(pipeline.discovery.vector_db.contents))  # Should be > 0

# Add demo or custom content
from Project import load_demo_contents
pipeline.discovery.vector_db.add_contents(load_demo_contents())
```

### Issue: Poor Content Matching

**Problem**: Recommended content doesn't match identified gaps

**Solution**:
```python
# 1. Add more content with relevant tags
# 2. Adjust search strategy
results = pipeline.discovery.discover_and_personalize(
    query=query,
    user_profile=profile,
    strategy="bm25",  # Try different strategies: "bm25", "dense", "hybrid"
    top_k=10  # Increase to get more candidates
)

# 3. Check content metadata
for content_id, content in pipeline.discovery.vector_db.contents.items():
    print(f"{content.title}: {content.tags}, {content.difficulty}")
```

## Performance Considerations

### Memory Usage
- Both systems operate in-memory
- DKE: O(items × responses) for assessment data
- Content Discovery: O(documents × vocabulary) for TF-IDF vectors
- Typical: < 100MB for 1000s of items and documents

### Speed
- DKE Assessment: ~0.1-1 second for 10-15 adaptive items
- Content Search: ~0.01-0.1 second for 100s-1000s of documents
- Full Pipeline: ~1-2 seconds end-to-end

### Scaling Tips
```python
# For large content libraries, use pagination
results = discovery.discover_and_personalize(
    query=query,
    user_profile=profile,
    top_k=5  # Limit results
)

# Batch process users
for user_batch in chunk_users(all_users, batch_size=10):
    # Process batch...
    pass

# Cache results (built-in)
# Second call with same query is instant
results1 = discovery.discover_and_personalize(query, profile)
results2 = discovery.discover_and_personalize(query, profile)  # Cached!
```

## Next Steps

1. **Run the demo**: `python dke_content_integration.py`
2. **Add your content**: Integrate with your content library
3. **Customize adapters**: Adjust difficulty mapping and prioritization
4. **Build UI**: Create a frontend for the recommendation system
5. **Deploy**: Set up as a web service (FastAPI, Flask, etc.)
6. **Monitor**: Track effectiveness of recommendations
7. **Iterate**: Refine based on learner outcomes

## Resources

- **DKE System**: `dke.py` (local file)
- **Content Discovery**: https://github.com/imranulf/content-discovery-system
- **Integration Module**: `dke_content_integration.py` (local file)
- **IRT/CAT Theory**: https://en.wikipedia.org/wiki/Item_response_theory
- **BKT Theory**: https://en.wikipedia.org/wiki/Bayesian_Knowledge_Tracing

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review the inline documentation in source files
3. Check the content-discovery-system README
4. Examine the demo code for usage examples

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Compatibility**: Python 3.8+
