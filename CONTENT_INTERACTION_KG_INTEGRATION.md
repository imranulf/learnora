# Content Interaction & Knowledge Graph Integration

## Overview

This document explains how content interactions (watching videos, reading articles, etc.) automatically update the knowledge graph and learning paths in the Learnora system.

## Architecture

### Flow Diagram

```
User Interacts with Content
    ↓
trackInteraction() called
    ↓
Interaction saved to database
    ↓
[If completion >= 50% OR type == COMPLETED]
    ↓
_sync_interaction_with_knowledge_graph()
    ↓
1. Calculate mastery increment
2. Map content tags to concepts
3. Update concept mastery levels
4. Update knowledge graph state
```

## Implementation Details

### 1. Interaction Tracking (`PreferenceService.track_interaction`)

**Location**: `app/features/users/preference_service.py`

**What it does**:
- Records content interaction in database
- Auto-evolves user preferences
- **NEW**: Syncs with knowledge graph if significantly engaged

**Trigger Conditions for KG Sync**:
```python
if completion_percentage >= 50 or interaction_type == InteractionTypeEnum.COMPLETED:
    # Sync with knowledge graph
```

### 2. Knowledge Graph Synchronization

**Method**: `_sync_interaction_with_knowledge_graph()`

**Process**:

1. **Tag-to-Concept Mapping**
   - Extracts tags from content (e.g., `["python", "machine learning", "neural networks"]`)
   - Normalizes tags (lowercase, replace spaces with underscores)
   - Matches tags to existing concepts in knowledge graph
   - Uses fuzzy matching for variations (e.g., "js" → "javascript", "ml" → "machine learning")

2. **Mastery Calculation**
   - Base increment depends on interaction type:
     - Viewed: 0.02
     - Clicked: 0.03
     - Completed: 0.15
     - Bookmarked: 0.05
     - Shared: 0.08
     - Rated: 0.05
   
   - Multiplied by completion percentage (0-100%)
   
   - Adjusted by difficulty level:
     - Beginner: ×0.8
     - Intermediate: ×1.0
     - Advanced: ×1.3
     - Expert: ×1.5
   
   - **Capped at 0.2 per interaction** to prevent gaming

3. **State Updates**
   - Mastery increment **≥ 0.1**: Mark concept as "known"
   - Mastery increment **< 0.1**: Mark concept as "learning"
   - Promotes concepts from "learning" → "known" when threshold reached

### 3. Concept Matching Algorithm

**Simple Matching**:
```python
# Direct substring match
"python" in "python_fundamentals" → MATCH
"react" in "reactjs" → MATCH
```

**Fuzzy Matching** (`_is_similar_concept`):
```python
# Common variations
"js" → "javascript"
"py" → "python"
"ml" → "machine learning"
"react" → "reactjs"
"api" → "apis"
```

**Root Matching**:
```python
# Strip common suffixes
"programming" → "program" (removes 'ing')
"databases" → "database" (removes 's')
```

## Examples

### Example 1: Watching a Python Tutorial

**Content**:
- Title: "Python for Beginners"
- Tags: `["python", "programming", "tutorial"]`
- Difficulty: "beginner"
- Completion: 100%
- Type: "COMPLETED"

**Result**:
```python
# Mastery calculation
base = 0.15  # Completed
completion_mult = 1.0  # 100%
difficulty_mult = 0.8  # Beginner
increment = 0.15 × 1.0 × 0.8 = 0.12

# State updates
"python" concept → Marked as KNOWN (increment ≥ 0.1)
"programming" concept → Marked as KNOWN
```

### Example 2: Briefly Viewing an Advanced Article

**Content**:
- Title: "Advanced Neural Networks"
- Tags: `["machine learning", "neural networks", "deep learning"]`
- Difficulty: "advanced"
- Completion: 30%
- Type: "VIEWED"

**Result**:
```python
# Mastery calculation
base = 0.02  # Viewed
completion_mult = 0.3  # 30%
difficulty_mult = 1.3  # Advanced
increment = 0.02 × 0.3 × 1.3 = 0.0078

# State updates
"machine_learning" concept → Marked as LEARNING (increment < 0.1)
"neural_networks" concept → Marked as LEARNING
"deep_learning" concept → Marked as LEARNING
```

### Example 3: Completing an Intermediate Course

**Content**:
- Title: "React Hooks and State Management"
- Tags: `["react", "javascript", "hooks", "state management"]`
- Difficulty: "intermediate"
- Completion: 85%
- Type: "COMPLETED"

**Result**:
```python
# Mastery calculation
base = 0.15  # Completed
completion_mult = 0.85  # 85%
difficulty_mult = 1.0  # Intermediate
increment = 0.15 × 0.85 × 1.0 = 0.1275

# State updates
"react" concept → Marked as KNOWN
"javascript" concept → Marked as KNOWN
"hooks" concept → Marked as KNOWN (if exists)
"state_management" concept → Marked as KNOWN (if exists)
```

## Error Handling

### Graceful Degradation

```python
try:
    self._sync_interaction_with_knowledge_graph(...)
except Exception as e:
    logger.error(f"Failed to sync interaction with knowledge graph: {e}")
    # Interaction still saved, KG sync failure doesn't block tracking
```

### No Matching Concepts

```python
if not matched_concept_ids:
    logger.info(f"No concepts matched for tags: {content_tags}")
    return  # No updates, but no error
```

## Configuration

### Mastery Thresholds

Can be adjusted in `_calculate_mastery_increment()`:

```python
# Change interaction weights
interaction_weights = {
    InteractionTypeEnum.COMPLETED: 0.15,  # Adjust this
    # ...
}

# Change difficulty multipliers
difficulty_multipliers = {
    "advanced": 1.3,  # Adjust this
    # ...
}

# Change maximum increment per interaction
return min(0.2, increment)  # Adjust cap here
```

### Sync Trigger Threshold

Can be adjusted in `track_interaction()`:

```python
# Current: 50% completion triggers sync
if completion_percentage >= 50:  # Change this threshold
    # ...
```

## API Impact

### Frontend Changes Required

**NO CHANGES NEEDED** - This is entirely backend automation!

The existing `trackInteraction` API call now automatically:
1. Saves interaction
2. Updates preferences
3. **NEW**: Updates knowledge graph

Frontend continues to call:
```typescript
await trackInteraction({
    content_id: content.id,
    interaction_type: 'clicked',
    content_tags: content.tags,  // Important!
    content_difficulty: content.difficulty,  // Important!
    completion_percentage: 80,  // Important!
}, token);
```

## Database Impact

### New Queries

The integration adds these queries per interaction (when threshold met):

1. Get all concepts: `ConceptService.get_all_concepts()`
2. Get user known concepts: `UserKnowledgeService.get_user_known_concepts()`
3. Get user learning concepts: `UserKnowledgeService.get_user_learning_concepts()`
4. Update concept state: `UserKnowledgeService.mark_concept_as_known/learning()`

**Performance**: ~4-5 additional queries per eligible interaction (cached in memory)

### Storage

- Content interactions: Already stored in `content_interactions` table
- Knowledge graph state: Stored in RDF files (user-specific)
- No new tables required

## Testing

### Manual Testing Steps

1. **Setup**: Ensure concepts exist in KG matching your content tags
   ```python
   # Create concepts: "python", "javascript", "react"
   ```

2. **Track Interaction**: Post content interaction via API
   ```bash
   POST /api/v1/preferences/interactions
   {
       "content_id": "python-tutorial-1",
       "interaction_type": "completed",
       "content_tags": ["python", "programming"],
       "content_difficulty": "beginner",
       "completion_percentage": 100
   }
   ```

3. **Verify Knowledge Graph**: Check user's knowledge graph
   ```bash
   GET /api/v1/knowledge-graph
   # Should show "python" and "programming" as "known"
   ```

4. **Check Logs**: Look for sync messages
   ```
   INFO: Marked concept 'python' as KNOWN for user 123 (increment: 0.120)
   INFO: Successfully updated 2 concepts for user 123 from content interaction
   ```

### Automated Testing

Add to `test_preference_service.py`:

```python
def test_interaction_updates_knowledge_graph():
    # Track interaction with tags
    service.track_interaction(
        user_id=1,
        content_id="test-1",
        interaction_type="completed",
        content_tags=["python"],
        content_difficulty="beginner",
        completion_percentage=100
    )
    
    # Verify concept was marked as known
    knowledge_service = UserKnowledgeService()
    known = knowledge_service.get_user_known_concepts("1")
    assert any("python" in str(uri) for uri in known)
```

## Monitoring

### Log Messages to Watch

```python
# Success
"Successfully updated X concepts for user Y from content interaction"

# Mapping
"No concepts matched for tags: [...]"

# Errors
"Failed to sync interaction with knowledge graph: ..."
"Failed to update concept X: ..."
```

### Metrics to Track

- Number of KG syncs triggered per day
- Average concepts updated per interaction
- Tag match rate (matched / total interactions)
- Error rate for KG sync

## Future Enhancements

### Potential Improvements

1. **Learning Path Progress Tracking**
   - Detect if content relates to active learning path
   - Auto-advance path steps when concepts completed
   
2. **Smart Recommendation Loop**
   - After marking concepts as known, suggest next concepts
   - Recommend content for unknown prerequisites
   
3. **Confidence Scores**
   - Track multiple interactions per concept
   - Build confidence level (not just known/learning/unknown)
   
4. **Decay Function**
   - Concepts marked as "known" decay over time without reinforcement
   - Encourage review of older material

5. **Batch Processing**
   - Queue KG updates for off-peak processing
   - Reduce real-time API latency

## Troubleshooting

### Issue: Concepts Not Updating

**Possible Causes**:
1. Tags don't match concept names in KG
2. Completion percentage < 50%
3. No concepts exist in KG yet
4. Concept matching algorithm too strict

**Solutions**:
- Check logs for "No concepts matched for tags"
- Verify concepts exist: `ConceptService.get_all_concepts()`
- Adjust matching thresholds
- Add concept aliases/synonyms

### Issue: Too Many/Too Few Updates

**Adjust Thresholds**:
```python
# Make more sensitive (more updates)
if completion_percentage >= 30:  # Lower threshold

# Make less sensitive (fewer updates)
if completion_percentage >= 80:  # Higher threshold
```

### Issue: Wrong Mastery Levels

**Adjust Calculation**:
```python
# More generous (faster progression)
interaction_weights = {
    InteractionTypeEnum.COMPLETED: 0.25,  # Increased from 0.15
}

# More conservative (slower progression)
interaction_weights = {
    InteractionTypeEnum.COMPLETED: 0.10,  # Decreased from 0.15
}
```

## Summary

This integration provides **automatic, intelligent knowledge graph updates** based on user content consumption patterns. It:

✅ Requires no frontend changes  
✅ Works with existing interaction tracking  
✅ Fails gracefully (doesn't break interaction tracking)  
✅ Uses smart tag-to-concept matching  
✅ Calculates context-aware mastery increments  
✅ Updates both knowledge graph and user state  

The system learns from user behavior and keeps the knowledge graph synchronized with what users are actually learning!
