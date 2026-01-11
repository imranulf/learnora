# Content Personalization - Quick API Reference

## 🎯 Quick Start

### Enable Personalization in Content Search

```bash
curl -X POST "http://localhost:8000/api/v1/content-discovery/search" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "python machine learning",
    "strategy": "hybrid",
    "top_k": 5,
    "personalize": true,
    "max_summary_words": 150
  }'

```text
**Response includes**:

- `personalized_summary` - Level-appropriate summary

- `tldr` - One-sentence quick summary

- `key_takeaways` - Main learning points

- `highlights` - Video timestamps (if applicable)

- `estimated_time` - Adjusted time estimate

---

## 🔧 Direct Personalization Endpoints

### 1. Personalize Specific Content

```bash
POST /api/v1/content-personalization/personalize

```text
**Request**:

```json
{
  "content_id": "abc-123",
  "user_level": "beginner",
  "max_summary_words": 200,
  "user_time_budget": 30,
  "include_highlights": true
}

```text
**User Levels**: `beginner` | `intermediate` | `advanced` | `expert`

---

### 2. Get Summary Only

```bash
POST /api/v1/content-personalization/summarize

```text
**Request**:

```json
{
  "content_id": "xyz-789",
  "user_level": "intermediate",
  "max_words": 150
}

```text
---

### 3. Adapt Content Difficulty

```bash
POST /api/v1/content-personalization/adapt-difficulty

```text
**Request**:

```json
{
  "text": "Your complex text here...",
  "current_level": "advanced",
  "target_level": "beginner"
}

```text
---

## 📊 Service Stats

```bash
GET /api/v1/content-personalization/stats

```text
Returns service status and capabilities.

---

## 💡 Frontend Integration Example

```typescript
// Search with personalization
const response = await fetch('/api/v1/content-discovery/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: searchQuery,
    strategy: 'hybrid',
    personalize: true,  // ✨ Enable personalization
    max_summary_words: 150
  })
});

const data = await response.json();

// Display personalized content
data.results.forEach(result => {
  console.log(result.tldr);                    // Quick summary
  console.log(result.personalized_summary);    // Full summary
  console.log(result.key_takeaways);          // Learning points
  console.log(result.highlights);             // Video moments
});

```text
---

## ⚡ Performance Tips

1. **Enable caching** (TODO) for frequently accessed content

2. **Use `personalize: false`** for quick searches

3. **Reduce `max_summary_words`** for faster responses

4. **Disable highlights** for non-video content

---

## 📝 Response Example

```json
{
  "results": [
    {
      "content": {
        "id": "py-ml-101",
        "title": "Python Machine Learning Basics",
        "content_type": "video",
        "difficulty": "intermediate"
      },
      "score": 0.95,
      "personalized_summary": "This beginner-friendly introduction shows you how computers can learn from data using Python. You'll discover simple patterns that help machines make predictions without explicit programming.",
      "tldr": "Learn ML fundamentals with Python in 30 minutes through hands-on examples.",
      "key_takeaways": [
        "Machine learning teaches computers to learn from examples",
        "Python's simple syntax makes ML accessible to beginners",
        "Start with basic concepts before diving into complex algorithms"
      ],
      "highlights": [
        {
          "timestamp": "05:30",
          "topic": "What is Machine Learning?",
          "description": "Clear explanation of ML fundamentals",
          "importance_score": 0.95
        },
        {
          "timestamp": "15:20",
          "topic": "First Python ML Example",
          "description": "Build your first model step-by-step",
          "importance_score": 0.90
        }
      ],
      "estimated_time": 35
    }
  ]
}

```text
---

## 🧪 Testing

Run the test suite:

```bash
cd core-service

python test_content_personalization.py

```text
---

## 🔗 Full Documentation

See `CONTENT_PERSONALIZATION_COMPLETE.md` for:

- Detailed architecture

- Implementation details

- Frontend integration guide

- Performance optimization

- Cost estimation

- Troubleshooting

---

## ✅ Status

- **Backend**: ✅ Implemented and running

- **API Endpoints**: ✅ All functional

- **Test Suite**: ✅ Available

- **Documentation**: ✅ Complete

- **Frontend Integration**: ⏳ Pending (next step)

**Server**: <http://localhost:8000>
**API Docs**: <http://localhost:8000/docs>
**Tag**: `content-personalization`
