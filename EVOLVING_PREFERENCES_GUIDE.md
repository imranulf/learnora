# Evolving User Preferences - Complete Guide 🧠

## Overview

Learnora now has **intelligent, evolving user preferences** that learn from your behavior! The system combines:

1. **Explicit Preferences** - Settings you control manually
2. **Implicit Learning** - Automatic adaptation based on your interactions  
3. **Hybrid Scoring** - Best of both worlds (70% behavioral + 30% explicit)

---

## How It Works

### 🎯 The Learning System

Every time you interact with content (click, view, complete, rate), the system:

1. **Tracks the Interaction**
   - Content type (video, article, tutorial)
   - Difficulty level
   - Time spent
   - Completion percentage
   - Rating (if provided)

2. **Analyzes Patterns** (last 30 days)
   - Which formats do you complete most?
   - What difficulty level are you mastering?
   - How long do you typically engage?
   - Which topics interest you?

3. **Updates Preferences Automatically**
   - Preferred formats → Top 3 most-completed types
   - Difficulty → Average of completed content
   - Available time → Average duration of completed content
   - Knowledge areas → Inferred from topics you engage with
   - Learning style → Inferred from format preferences

### 📊 Weighting System

Not all interactions are equal:

```
viewed        = 1.0x weight
clicked       = 1.2x weight  
completed     = 2.0x weight ⭐ (highest impact)
bookmarked    = 1.5x weight
shared        = 1.8x weight
rated         = 1.3x weight

Bonuses:
- Completion ≥80% → +50% weight
- Rating ≥4 stars → +30% weight
```

---

## Database Schema

### New Tables

**`user_learning_preferences`**
```sql
- id: Primary key
- user_id: Foreign key to user table
- preferred_formats: JSON array ["video", "article"]
- learning_style: enum (visual, auditory, reading, kinesthetic, balanced)
- available_time_daily: int (minutes)
- knowledge_areas: JSON dict {"python": "intermediate"}
- learning_goals: JSON array ["master react", "learn ML"]
- preferred_difficulty: str (beginner, intermediate, advanced, expert)
- auto_evolve: boolean (enable/disable auto-learning)
- created_at, updated_at: timestamps
```

**`content_interactions`**
```sql
- id: Primary key
- user_id: Foreign key to user table
- content_id: str
- content_title, content_type, content_difficulty: str
- content_duration_minutes: int
- content_tags: JSON array
- interaction_type: enum (viewed, clicked, completed, etc.)
- duration_seconds: int
- rating: float (1-5 stars, optional)
- completion_percentage: int (0-100)
- timestamp: datetime
```

---

## API Endpoints

### 1. Get Preferences
```http
GET /api/v1/preferences/
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "preferred_formats": ["video", "tutorial"],
  "learning_style": "visual",
  "available_time_daily": 45,
  "knowledge_areas": {
    "python": "intermediate",
    "react": "beginner"
  },
  "learning_goals": ["master TypeScript"],
  "preferred_difficulty": "intermediate",
  "auto_evolve": true,
  "created_at": "2025-11-02T10:00:00Z",
  "updated_at": "2025-11-02T15:30:00Z"
}
```

### 2. Update Preferences
```http
PUT /api/v1/preferences/
Authorization: Bearer {token}
Content-Type: application/json

{
  "preferred_formats": ["video", "article"],
  "learning_style": "visual",
  "available_time_daily": 60,
  "preferred_difficulty": "advanced",
  "learning_goals": ["master React", "learn Python"],
  "auto_evolve": true
}
```

### 3. Track Interaction
```http
POST /api/v1/preferences/interactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "content_id": "abc123",
  "interaction_type": "completed",
  "content_title": "React Hooks Tutorial",
  "content_type": "video",
  "content_difficulty": "intermediate",
  "content_duration_minutes": 45,
  "content_tags": ["react", "hooks", "frontend"],
  "duration_seconds": 2700,
  "completion_percentage": 100,
  "rating": 5
}
```

**Interaction Types:**
- `viewed` - User opened the content
- `clicked` - User clicked on content card
- `completed` - User finished the content
- `bookmarked` - User saved for later
- `shared` - User shared with others
- `rated` - User provided rating

### 4. Get Learning Insights
```http
GET /api/v1/preferences/insights
Authorization: Bearer {token}
```

**Response:**
```json
{
  "preferences": {
    "preferred_formats": ["video", "tutorial"],
    "learning_style": "visual",
    "preferred_difficulty": "intermediate",
    "available_time_daily": 45,
    "knowledge_areas": {"python": "intermediate"},
    "learning_goals": ["master TypeScript"],
    "auto_evolve": true
  },
  "stats": {
    "total_interactions": 127,
    "completed_count": 45,
    "completion_rate": 35.4,
    "average_rating": 4.6,
    "learning_streak_days": 7
  },
  "last_updated": "2025-11-02T15:30:00Z"
}
```

---

## Frontend Integration

### Automatic Interaction Tracking

**ContentCard.tsx** now automatically tracks clicks:

```tsx
const handleClick = async () => {
    // Track interaction
    if (session?.access_token) {
        const durationSeconds = Math.floor((Date.now() - clickTime) / 1000);
        
        await trackInteraction({
            content_id: content.id,
            interaction_type: 'clicked',
            content_title: content.title,
            content_type: content.content_type,
            content_difficulty: content.difficulty,
            content_duration_minutes: content.duration_minutes,
            content_tags: content.tags,
            duration_seconds: durationSeconds,
            completion_percentage: 0,
        }, session.access_token);
    }
    
    // Open content
    window.open(content.url, '_blank');
};
```

### Manual Interaction Tracking

Track any interaction from anywhere:

```tsx
import { trackInteraction } from '../services/preferences';

// When user completes content
await trackInteraction({
    content_id: 'content-123',
    interaction_type: 'completed',
    content_title: 'Advanced React Patterns',
    content_type: 'video',
    content_difficulty: 'advanced',
    content_duration_minutes: 60,
    content_tags: ['react', 'patterns', 'advanced'],
    duration_seconds: 3600,
    completion_percentage: 100,
    rating: 5
}, session.access_token);
```

### Preferences Settings Page

Navigate to `/preferences` to:
- Set preferred content formats
- Choose learning style
- Set daily time availability
- Add learning goals
- View learning statistics
- Toggle auto-evolve on/off

---

## How Search Uses Preferences

**Before** (Static):
```python
user_profile = UserProfile(
    preferred_formats=[],           # Empty!
    available_time_daily=60,        # Fixed
    learning_style="balanced",      # Fixed
    knowledge_areas={},             # Empty!
)
```

**After** (Dynamic):
```python
# Load from database and interaction history
pref_service = PreferenceService(db)
user_profile = pref_service.build_user_profile(user.id)

# Real data!
# preferred_formats: ["video", "tutorial"] (learned from completions)
# available_time_daily: 45 (average from behavior)
# learning_style: "visual" (inferred from formats)
# knowledge_areas: {"python": "intermediate"} (from topics)
```

**Scoring Impact:**
```python
# Format boost (+10% if matches preference)
if content.type in user_profile.preferred_formats:
    score *= 1.1

# Time boost (+5% if fits schedule)
if content.duration <= user_profile.available_time_daily:
    score *= 1.05

# Difficulty boost (+20% if matches level)
if content.difficulty == knowledge_areas.get(topic):
    score *= 1.2
```

---

## Evolution Examples

### Example 1: New User

**Day 1 (Default):**
```json
{
  "preferred_formats": [],
  "learning_style": "balanced",
  "available_time_daily": 60,
  "knowledge_areas": {},
  "auto_evolve": true
}
```

**Day 7 (After interactions):**
```json
{
  "preferred_formats": ["video", "tutorial"],  // Completed most
  "learning_style": "visual",                  // Inferred
  "available_time_daily": 35,                  // Average duration
  "knowledge_areas": {
    "react": "beginner",
    "javascript": "intermediate"
  },
  "auto_evolve": true
}
```

**Day 30 (Evolved):**
```json
{
  "preferred_formats": ["video", "tutorial", "documentation"],
  "learning_style": "visual",
  "available_time_daily": 45,                  // Increased!
  "knowledge_areas": {
    "react": "intermediate",                   // Leveled up!
    "javascript": "advanced",                  // Mastery!
    "typescript": "beginner",                  // New interest
    "node": "intermediate"
  },
  "auto_evolve": true
}
```

### Example 2: Format Preference Learning

**User completes:**
- 10 videos (80%+ completion, 4.5★ avg)
- 3 articles (40% completion, 3.0★ avg)
- 8 tutorials (90%+ completion, 4.8★ avg)

**System learns:**
```
Weighted Scores:
- video:   10 × 2.0 × 1.5 × 1.3 = 39.0
- tutorial: 8 × 2.0 × 1.5 × 1.3 = 31.2
- article:  3 × 2.0 × 1.0 × 1.0 = 6.0

Result: preferred_formats = ["video", "tutorial"]
```

---

## Settings & Controls

### Enable/Disable Auto-Evolution

```tsx
// Disable auto-learning
await updatePreferences({
    auto_evolve: false
}, token);

// Preferences will stay fixed until manually updated
```

### Manual Override

Even with auto-evolve ON, manual updates take precedence:

```tsx
// Explicitly set preferences
await updatePreferences({
    preferred_formats: ["documentation"],  // Force this
    auto_evolve: true                     // Keep learning
}, token);

// System will still learn, but won't change formats
// unless your behavior strongly contradicts this
```

---

## Testing the System

### 1. Track Some Interactions

```javascript
const token = localStorage.getItem('auth_token');

// Complete a video
await fetch('http://localhost:8000/api/v1/preferences/interactions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        content_id: 'test-1',
        interaction_type: 'completed',
        content_type: 'video',
        content_difficulty: 'intermediate',
        duration_seconds: 600,
        completion_percentage: 100,
        rating: 5
    })
});
```

### 2. Check Insights

```javascript
const insights = await fetch('http://localhost:8000/api/v1/preferences/insights', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(insights);
```

### 3. Search with Preferences

Just search normally - preferences are applied automatically!

---

## Benefits

✅ **Personalized Results** - Content ranked by YOUR preferences
✅ **No Manual Configuration** - System learns from behavior
✅ **Adaptive Over Time** - Preferences evolve with you
✅ **Privacy-First** - All data stays in your database
✅ **Manual Control** - Override anytime
✅ **Transparent** - View insights and statistics

---

## Next Steps

1. **Run Backend**: `python -m uvicorn app.main:app --reload`
2. **Create Database Tables**: Auto-created on first run
3. **Test Preferences API**: Use browser or Postman
4. **Add Route**: Add `/preferences` to frontend router
5. **Start Tracking**: Click content cards to generate data
6. **Watch It Learn**: Check insights after a few interactions!

The system is ready to evolve with you! 🚀
