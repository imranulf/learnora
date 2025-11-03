# User Knowledge Dashboard

## Overview
A comprehensive dashboard for tracking user learning progress with mastery levels, scores, and interactive visualizations.

## Features

### 📊 **Visual Analytics**
- **Summary Cards**: Total concepts, known, learning, average score
- **Pie Chart**: Mastery distribution visualization with Recharts
- **Bar Chart**: Concept breakdown by mastery level
- **Color-Coded Mastery**:
  - Green: Known concepts
  - Yellow: Currently learning
  - Gray: Not started

### 📋 **Data Table**
- **Concept Information**: Name, ID, mastery status
- **Progress Bars**: Visual score representation (0-100%)
- **Last Updated**: Timestamp for each knowledge item
- **Inline Editing**: Quick edit button for each row

### 🔧 **Functionality**
- **Filtering**: Filter by mastery level (known, learning, not_started)
- **Sorting**: Sort by score or last updated date
- **Edit Modal**: Update mastery level and score
- **Sync Button**: Sync with latest assessment results
- **Real-time Updates**: Automatic refresh after edits

### 🎨 **Design Consistency**
- Gradient header (`from-blue-600 to-indigo-700`) matching Learning Path & Knowledge Graph
- Framer Motion animations
- Tailwind CSS styling
- Headless UI modals
- Toast notifications

## Backend API

### Endpoints

#### GET `/api/v1/user-knowledge/dashboard`
Get user knowledge dashboard data
- **Authentication**: Required (JWT Bearer token)
- **Query Parameters**:
  - `mastery` (optional): Filter by mastery level
  - `sort_by` (optional): Sort field (score, last_updated)
- **Response**:
  ```json
  {
    "items": [
      {
        "id": "oop_concepts",
        "concept": "Object-Oriented Programming",
        "mastery": "known",
        "score": 0.85,
        "last_updated": "2025-11-02T10:30:00"
      }
    ],
    "total": 10,
    "summary": {
      "total_concepts": 10,
      "known": 4,
      "learning": 3,
      "not_started": 3,
      "average_score": 0.67,
      "mastery_distribution": {
        "known": 4,
        "learning": 3,
        "not_started": 3
      }
    }
  }
  ```

#### PATCH `/api/v1/user-knowledge/dashboard/{concept_id}`
Update a user knowledge item
- **Authentication**: Required
- **Path Parameter**: `concept_id` - The concept identifier
- **Request Body**:
  ```json
  {
    "mastery": "known",  // Optional: known, learning, not_started
    "score": 0.9         // Optional: 0.0 to 1.0
  }
  ```

#### POST `/api/v1/user-knowledge/dashboard/sync`
Sync with latest assessment results
- **Authentication**: Required
- **Response**:
  ```json
  {
    "message": "Successfully synced with latest assessment",
    "updated_concepts": 5,
    "timestamp": "2025-11-02T10:35:00"
  }
  ```

## Data Storage

### Hybrid Storage System
1. **RDF Graph**: Stores concept relationships (knows, learning)
2. **JSON Metadata** (`data/user_knowledge_metadata.json`):
   ```json
   {
     "user_123": {
       "oop_concepts": {
         "concept": "Object-Oriented Programming",
         "mastery": "known",
         "score": 0.85,
         "last_updated": "2025-11-02T10:30:00"
       }
     }
   }
   ```

## Frontend Architecture

### Components
- **UserKnowledgeDashboard.tsx**: Main dashboard component
  - State management for items, summary, filters
  - Chart data preparation
  - Modal handling
  - Toast notifications

### Services
- **userKnowledge.ts**: API client
  - `getUserKnowledgeDashboard()`: Fetch dashboard data
  - `updateUserKnowledgeItem()`: Update knowledge item
  - `syncWithAssessment()`: Trigger assessment sync

### Routing
- Route: `/user-knowledge`
- Page: `pages/user-knowledge.tsx`
- Navigation: PsychologyIcon (brain icon)

## Usage

### Viewing Dashboard
1. Navigate to "Knowledge Dashboard" from sidebar
2. View summary cards with total stats
3. Examine pie/bar charts for visual distribution
4. Browse table for detailed concept information

### Filtering & Sorting
1. Use "Filter by Mastery" dropdown to filter concepts
2. Use "Sort by" dropdown to change sort order
3. Results update automatically

### Editing Knowledge Items
1. Click "Edit" button on any table row
2. Update mastery level (dropdown)
3. Update score (0-100% input)
4. Click "Update" to save changes
5. Toast notification confirms success

### Syncing with Assessment
1. Click "🔄 Sync with Latest Assessment" button in header
2. System pulls latest assessment scores
3. Updates knowledge items automatically
4. Shows count of updated concepts

## Technical Details

### Dependencies
- **Frontend**:
  - React 19
  - TypeScript
  - Tailwind CSS 3.4.0
  - Recharts (charts)
  - Framer Motion (animations)
  - Headless UI (modals)
  - Material-UI PsychologyIcon

- **Backend**:
  - FastAPI
  - Python 3.13.5
  - RDFlib (knowledge graph)
  - JSON storage

### File Structure
```
learner-web-app/
├── src/
│   ├── features/
│   │   └── user-knowledge/
│   │       └── UserKnowledgeDashboard.tsx
│   ├── services/
│   │   └── userKnowledge.ts
│   └── pages/
│       └── user-knowledge.tsx

core-service/
├── app/
│   └── features/
│       └── users/
│           └── knowledge/
│               ├── router.py (enhanced)
│               ├── service.py (enhanced)
│               └── storage.py (NEW)
└── data/
    └── user_knowledge_metadata.json (created on first use)
```

### Color Scheme
- **Primary Gradient**: `from-blue-600 to-indigo-700`
- **Mastery Colors**:
  - Known: Green (#10B981)
  - Learning: Yellow (#F59E0B)
  - Not Started: Gray (#6B7280)
- **Success Toast**: Green
- **Error Toast**: Red

## Integration with Assessment

The dashboard integrates with the Assessment feature through:
1. **Knowledge States** table: Stores BKT probability scores
2. **Sync Endpoint**: Pulls latest assessment results
3. **Future Enhancement**: Automatic sync after assessment completion

## Future Enhancements
- [ ] Automatic sync after assessment completion
- [ ] Progress over time chart (line graph)
- [ ] Concept prerequisite tree view
- [ ] Export dashboard as PDF/CSV
- [ ] Learning recommendations based on gaps
- [ ] Gamification (badges, achievements)
- [ ] Comparison with peer averages
- [ ] Mobile-optimized card view
- [ ] Dark mode support

## Testing Checklist
- ✅ Authentication required guard works
- ✅ Dashboard loads with summary cards
- ✅ Pie chart displays correctly
- ✅ Bar chart displays correctly
- ✅ Table shows all knowledge items
- ✅ Filter by mastery works
- ✅ Sort by score/date works
- ✅ Edit modal opens and updates
- ✅ Sync button triggers sync
- ✅ Toast notifications appear
- ✅ Responsive on mobile/tablet/desktop
- ✅ Empty state displays correctly
- ✅ Loading state shows spinner
- ✅ Error handling works

## Known Limitations
- Assessment sync currently returns placeholder data (implementation needed)
- No real-time updates (requires WebSocket)
- Limited to 100 concepts per page (pagination not implemented)

## Performance Considerations
- Charts re-render only when data changes
- useCallback for fetch functions
- Debounced filter/sort updates
- Lazy loading for large datasets (future)
