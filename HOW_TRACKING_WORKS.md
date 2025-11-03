# How Learnora Tracks Your Learning Progress

## Overview

Learnora uses a multi-layered system to track your content consumption time and knowledge progression. Here's how everything works:

---

## 1. Content Consumption Time Tracking

### A. Real-Time Interaction Tracking

**Database Table:** `content_interactions`

Every time you interact with content, Learnora tracks:

```python
ContentInteraction(
    user_id=your_id,
    content_id="unique-content-id",
    content_title="Python Machine Learning Tutorial",
    content_type="video",  # video, article, tutorial, course
    content_difficulty="intermediate",
    content_duration_minutes=45,  # Original duration
    content_tags=["python", "machine-learning", "scikit-learn"],
    
    # YOUR INTERACTION DATA
    interaction_type="VIEW",  # VIEW, CLICK, BOOKMARK, SHARE, COMPLETED
    duration_seconds=2700,  # How long you actually spent (45 minutes = 2700 seconds)
    rating=4.5,  # Optional: 1-5 stars
    completion_percentage=85,  # How much you completed (0-100%)
    timestamp=now()  # When this happened
)
```

### B. Interaction Types Tracked

| Type | Weight | Description |
|------|--------|-------------|
| **VIEW** | 1.0 | You viewed/opened the content |
| **CLICK** | 0.5 | You clicked to see more details |
| **BOOKMARK** | 1.5 | You saved it for later |
| **SHARE** | 1.8 | You shared it with others |
| **COMPLETED** | 2.0 | You finished the entire content |

### C. How Duration is Measured

1. **Start Timer:** When you open content
2. **Track Active Time:** Only counts when tab is active (not background)
3. **Record on Exit:** Saves `duration_seconds` when you:
   - Close the content
   - Navigate away
   - Session timeout (30 minutes idle)

### D. API Endpoint

**POST** `/api/v1/preferences/track-interaction`

```json
{
  "content_id": "youtube-abc123",
  "interaction_type": "VIEW",
  "content_title": "Advanced React Patterns",
  "content_type": "video",
  "content_difficulty": "advanced",
  "content_duration_minutes": 60,
  "content_tags": ["react", "javascript", "hooks"],
  "duration_seconds": 3600,  // You watched for 60 minutes
  "completion_percentage": 100,
  "rating": 5
}
```

**Response:**
```json
{
  "id": 12345,
  "user_id": 4,
  "interaction_type": "VIEW",
  "duration_seconds": 3600,
  "completion_percentage": 100,
  "timestamp": "2025-11-03T12:30:00Z",
  "preferences_evolved": true  // Your preferences were updated!
}
```

---

## 2. Knowledge Progression Tracking

### A. Knowledge States (BKT Model)

**Database Table:** `knowledge_states`

Uses **Bayesian Knowledge Tracing (BKT)** to estimate your mastery:

```python
KnowledgeState(
    user_id=your_id,
    skill="machine-learning",  # Specific skill/concept
    mastery_probability=0.75,  # 75% chance you know this (0.0 to 1.0)
    confidence_level=4.0,  # Your self-assessment (1-5)
    last_updated=now(),
    state_metadata={
        "practice_count": 12,
        "correct_streak": 5,
        "last_practice": "2025-11-02",
        "difficulty_level": "intermediate"
    }
)
```

### B. How Mastery Probability is Calculated

**Initial State:**
- When you first start: `P(mastery) = 0.2` (20% - beginner assumption)

**After Each Assessment/Quiz:**
```python
# If you answer correctly:
P(mastery) = P(mastery_before) + (1 - P(mastery_before)) * P(learn)
# P(learn) = probability you learned from this question

# If you answer incorrectly:
P(mastery) = P(mastery_before) * P(slip)
# P(slip) = probability this was just a careless mistake
```

**Example Progression:**
```
Question 1 (Correct): 0.20 → 0.36 (+16% mastery)
Question 2 (Correct): 0.36 → 0.51 (+15% mastery)
Question 3 (Wrong):   0.51 → 0.41 (-10% mastery)
Question 4 (Correct): 0.41 → 0.56 (+15% mastery)
Question 5 (Correct): 0.56 → 0.69 (+13% mastery)
```

**Mastery Levels:**
- 🔴 **Beginner:** 0.0 - 0.4 (0-40% mastery)
- 🟡 **Intermediate:** 0.4 - 0.7 (40-70% mastery)
- 🟢 **Advanced:** 0.7 - 0.9 (70-90% mastery)
- ⭐ **Expert:** 0.9 - 1.0 (90-100% mastery)

### C. Learning Gaps Detection

**Database Table:** `learning_gaps`

Automatically identifies what you need to work on:

```python
LearningGap(
    user_id=your_id,
    skill="python-decorators",
    mastery_level=0.35,  # You're at 35% mastery
    priority="high",  // Based on mastery < 0.5 and importance
    recommended_difficulty="beginner",
    estimated_study_time=120,  # 2 hours to close this gap
    rationale="Your assessment showed confusion with decorator syntax and use cases",
    is_addressed=False,  # You haven't studied this yet
    created_at=now()
)
```

**Priority Calculation:**
```python
if mastery_level < 0.3:
    priority = "high"  # Critical gap
elif mastery_level < 0.6:
    priority = "medium"  # Needs work
else:
    priority = "low"  # Minor refinement
```

### D. Assessment Flow

**POST** `/api/v1/assessments/submit`

```json
{
  "assessment_id": 5,
  "responses": [
    {
      "item_id": 1,
      "skill": "react-hooks",
      "selected_option": "B",
      "is_correct": true,
      "time_spent": 30  // seconds
    },
    {
      "item_id": 2,
      "skill": "react-hooks",
      "selected_option": "A",
      "is_correct": false,
      "time_spent": 45
    }
  ]
}
```

**Response:**
```json
{
  "score": 0.65,  // 65% correct
  "correct_count": 13,
  "total_count": 20,
  "knowledge_states": [
    {
      "skill": "react-hooks",
      "mastery_probability": 0.58,
      "previous_mastery": 0.45,
      "change": "+0.13"  // You improved!
    },
    {
      "skill": "react-state-management",
      "mastery_probability": 0.72,
      "previous_mastery": 0.68,
      "change": "+0.04"
    }
  ],
  "learning_gaps": [
    {
      "skill": "react-context-api",
      "mastery_level": 0.35,
      "priority": "high",
      "estimated_study_time": 90
    }
  ],
  "recommendations": [
    "Focus on React Context API (high priority gap)",
    "Practice more with custom hooks",
    "You're doing great with state management!"
  ]
}
```

---

## 3. Automatic Preference Evolution

### A. How It Works

**Every time you interact with content:**

```python
if interaction.completion_percentage >= 50 or interaction_type == "COMPLETED":
    # Auto-evolve your preferences based on what you actually engage with
    evolve_preferences(user_id)
```

**What Gets Learned:**

1. **Preferred Content Formats**
   ```python
   # If you complete 80% of videos but only 40% of articles
   preferred_formats = ["video", "tutorial"]  # Videos work better for you
   ```

2. **Optimal Difficulty Level**
   ```python
   # If you rate "intermediate" content higher and complete more
   preferred_difficulty = "intermediate"
   ```

3. **Time Budget**
   ```python
   # If you mostly consume 15-30 minute content
   available_time_daily = 25  # minutes
   ```

4. **Topic Interests**
   ```python
   # Based on tags from completed content
   knowledge_areas = {
       "python": 0.85,  // 85% interest/proficiency
       "machine-learning": 0.72,
       "web-development": 0.45
   }
   ```

### B. Weighting System

Interactions are weighted by importance:

```python
def interaction_weight(interaction):
    base_weight = {
        "VIEW": 1.0,
        "BOOKMARK": 1.5,
        "COMPLETED": 2.0
    }[interaction.type]
    
    # Boost for high completion
    if interaction.completion_percentage >= 80:
        base_weight *= 1.5
    
    # Boost for high ratings
    if interaction.rating >= 4:
        base_weight *= 1.3
    
    return base_weight
```

**Example:**
```
Completed video (100%) + 5-star rating:
  2.0 (completed) × 1.5 (high completion) × 1.3 (high rating) = 3.9x weight

Viewed article (20%) + no rating:
  1.0 (view) × 1.0 × 1.0 = 1.0x weight
```

---

## 4. Dashboard Analytics

### A. Weekly Activity Summary

**GET** `/api/v1/dashboard/stats`

```json
{
  "total_time_spent": 480,  // 8 hours this week
  "content_consumed": 12,  // 12 pieces of content
  "average_completion": 78,  // 78% average completion rate
  "skills_improved": 5,  // 5 skills showed mastery increase
  "learning_streak": 7,  // 7 consecutive days active
  
  "daily_breakdown": [
    {"date": "2025-10-28", "minutes": 45, "items": 2},
    {"date": "2025-10-29", "minutes": 90, "items": 3},
    {"date": "2025-10-30", "minutes": 60, "items": 2},
    // ...
  ],
  
  "top_skills": [
    {"skill": "python", "mastery": 0.82, "change": "+0.12"},
    {"skill": "react", "mastery": 0.67, "change": "+0.08"},
    {"skill": "sql", "mastery": 0.55, "change": "+0.15"}
  ]
}
```

### B. Recent Activity Feed

**GET** `/api/v1/dashboard/activity`

```json
{
  "activities": [
    {
      "type": "content_completed",
      "content_title": "Python Decorators Deep Dive",
      "duration_minutes": 30,
      "completion": 100,
      "rating": 5,
      "timestamp": "2025-11-03T10:30:00Z"
    },
    {
      "type": "assessment_passed",
      "assessment_title": "React Hooks Mastery Test",
      "score": 85,
      "skills_improved": ["react-hooks", "react-effects"],
      "timestamp": "2025-11-03T09:15:00Z"
    },
    {
      "type": "knowledge_gained",
      "skill": "machine-learning",
      "previous_mastery": 0.45,
      "current_mastery": 0.62,
      "change": "+0.17",
      "timestamp": "2025-11-02T16:20:00Z"
    }
  ]
}
```

---

## 5. Knowledge Graph Integration

### A. Concept Relationships

Your knowledge is mapped in a graph:

```
Python (0.85 mastery)
  ├── Decorators (0.62 mastery) ← You need more work here
  ├── Generators (0.78 mastery)
  └── Async/Await (0.45 mastery) ← Learning gap detected
  
Machine Learning (0.58 mastery)
  ├── Supervised Learning (0.72 mastery)
  │   ├── Linear Regression (0.80 mastery)
  │   └── Decision Trees (0.65 mastery)
  └── Unsupervised Learning (0.42 mastery) ← Recommended next topic
```

### B. Automatic Recommendations

Based on your knowledge graph:

```python
def recommend_next_topic(user_id):
    # Find concepts where:
    # 1. You have mastery in prerequisites (>0.6)
    # 2. But low mastery in the concept itself (<0.5)
    # 3. And it's related to your interests
    
    return sorted_by_priority([
        "async-await",  // You know Python well, this is next logical step
        "unsupervised-learning",  // You mastered supervised, time for this
    ])
```

---

## 6. Personalization Impact

### A. Content Ranking Boost

When you search, results are personalized:

```python
final_score = base_relevance_score + personalization_boost

personalization_boost = (
    0.2 * format_match +  // Matches your preferred format
    0.3 * difficulty_match +  // Matches your level
    0.2 * topic_interest +  // You're interested in this topic
    0.3 * knowledge_gap_relevance  // Fills a learning gap
)
```

**Example:**
```
Search: "python async programming"

Result A: "Async/Await for Beginners" (Video, Beginner)
  Base Score: 0.85
  Format Match: 0.9 (you love videos)
  Difficulty: 0.3 (too easy for you)
  Interest: 0.8 (high interest in Python)
  Gap Relevance: 0.9 (fills your async gap!)
  → Final: 0.85 + (0.2*0.9 + 0.3*0.3 + 0.2*0.8 + 0.3*0.9) = 1.45

Result B: "Advanced Async Patterns" (Article, Advanced)
  Base Score: 0.80
  Format Match: 0.4 (you prefer videos)
  Difficulty: 0.9 (perfect for you!)
  Interest: 0.8
  Gap Relevance: 0.9
  → Final: 0.80 + (0.2*0.4 + 0.3*0.9 + 0.2*0.8 + 0.3*0.9) = 1.51

Winner: Result B (even though lower base relevance, it matches you better!)
```

### B. Summary Personalization

AI adjusts summaries to your level:

**Beginner Summary:**
> "Async/await is a way to write asynchronous code in Python that looks like regular sequential code. Think of it like waiting in line - you can do other things while waiting for your turn."

**Advanced Summary:**
> "Async/await provides syntactic sugar for coroutine-based concurrency, enabling non-blocking I/O operations while maintaining readable control flow through the event loop."

---

## 7. Complete User Journey Example

### Day 1: New User

```python
# No knowledge states yet
GET /api/v1/users/me/knowledge-states
→ []

# Take initial assessment
POST /api/v1/assessments/submit
→ Creates initial knowledge states for each skill
```

### Day 2-7: Active Learning

```python
# Search for content
POST /api/v1/content-discovery/search
{
  "query": "python async",
  "personalize": true  // ← Personalization enabled!
}
→ Results ranked by your preferences

# Watch a video (30 min)
POST /api/v1/preferences/track-interaction
{
  "content_id": "video-123",
  "interaction_type": "VIEW",
  "duration_seconds": 1800,
  "completion_percentage": 100
}
→ Preferences auto-evolve!

# Take practice quiz
POST /api/v1/quizzes/123/submit
→ Knowledge states updated via BKT
```

### Week 2: Progress Review

```python
GET /api/v1/dashboard/stats
→ {
    "total_time_spent": 840,  // 14 hours
    "skills_improved": 8,
    "average_mastery": 0.62,  // Up from 0.35!
    "learning_gaps": [
        {"skill": "async-context-managers", "priority": "medium"}
    ]
}
```

### Month 1: Expert Path

```python
# System automatically:
# 1. Recommends advanced content (you've mastered intermediate)
# 2. Suggests async-context-managers (fills gap)
# 3. Prioritizes videos (your preferred format)
# 4. Estimates 20 min study time (your sweet spot)

GET /api/v1/content-discovery/recommendations
→ Personalized content pipeline ready!
```

---

## 8. Privacy & Control

### A. Data You Can View

- All your interactions: `/api/v1/preferences/interactions`
- All knowledge states: `/api/v1/users/me/knowledge-states`
- All learning gaps: `/api/v1/users/me/learning-gaps`

### B. Data You Can Control

```python
# Disable auto-evolve
PATCH /api/v1/preferences/
{
  "auto_evolve": false  // Manual control
}

# Reset knowledge states
DELETE /api/v1/users/me/knowledge-states

# Export all data
GET /api/v1/users/me/export
→ JSON file with everything
```

---

## Summary

**Content Consumption Time Tracking:**
✅ Real-time duration tracking (seconds)  
✅ Completion percentage (0-100%)  
✅ Interaction type weighting  
✅ Automatic preference evolution  

**Knowledge Progression:**
✅ Bayesian Knowledge Tracing (BKT)  
✅ Mastery probability per skill (0.0-1.0)  
✅ Automatic learning gap detection  
✅ Priority-based recommendations  
✅ Knowledge graph relationships  

**Personalization:**
✅ Content ranking boost  
✅ AI-adjusted summaries  
✅ Difficulty adaptation  
✅ Format preferences  

Everything is tracked, analyzed, and used to create a truly personalized learning experience!
