# Concept Management Feature

## Overview
A complete CRUD (Create, Read, Update, Delete) interface for managing learning concepts with search, filtering, and pagination capabilities.

## Features

### ✨ User Interface
- **Modern Design**: Gradient header matching Knowledge Graph and Learning Path styles
- **Responsive Grid Layout**: Cards adjust from 1 to 3 columns based on screen size
- **Smooth Animations**: Framer Motion for loading, transitions, and toast notifications
- **Headless UI Dialogs**: Modal forms for creating and editing concepts
- **Real-time Search**: Search concepts by label, description, or ID
- **Advanced Filtering**: Filter by category (Programming, Math, Science, General) and difficulty (Beginner, Intermediate, Advanced, Expert)
- **Pagination**: Navigate through large concept lists with page controls
- **Toast Notifications**: Success and error feedback for all operations

### 🎨 Concept Cards
Each concept card displays:
- **Title**: Bold heading with concept label
- **ID**: Unique identifier
- **Description**: Truncated to 3 lines with "line-clamp"
- **Category**: Icon-prefixed category badge
- **Difficulty**: Color-coded difficulty badge (green/yellow/orange/red)
- **Tags**: Pill-style tags for keywords
- **Actions**: Edit and Delete buttons

### 📝 Create/Edit Modal
Form fields:
- **Concept ID**: Required, unique identifier (disabled when editing)
- **Label**: Required, display name
- **Description**: Optional, multi-line textarea
- **Category**: Dropdown selection
- **Difficulty**: Dropdown selection
- **Tags**: Comma-separated input
- **Prerequisites**: Array of related concept IDs (future enhancement)

### 🔐 Authentication
- Requires JWT authentication via `useSession` hook
- Displays "Authentication Required" message when not logged in
- Token automatically included in all API requests

## Backend API

### Endpoints

#### GET `/api/v1/concepts`
List concepts with pagination and filtering
- **Query Parameters**:
  - `page` (default: 1)
  - `page_size` (default: 20, max: 100)
  - `search`: Filter by concept label or description
  - `category`: Filter by category
  - `difficulty`: Filter by difficulty
- **Response**:
  ```json
  {
    "items": [...],
    "total": 42,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
  ```

#### POST `/api/v1/concepts`
Create a new concept
- **Request Body**:
  ```json
  {
    "concept_id": "oop_concepts",
    "label": "Object-Oriented Programming",
    "description": "Programming paradigm based on objects",
    "category": "Programming",
    "difficulty": "Intermediate",
    "tags": ["programming", "design patterns"],
    "prerequisites": ["programming_basics"]
  }
  ```

#### GET `/api/v1/concepts/{concept_id}`
Get a specific concept by ID

#### PATCH `/api/v1/concepts/{concept_id}`
Update an existing concept
- **Request Body**: All fields optional except `concept_id` cannot be changed

#### DELETE `/api/v1/concepts/{concept_id}`
Delete a concept

### Data Storage

**Hybrid Storage System**:
1. **RDF Graph** (`core-service/data/graph/`): Stores concept relationships and prerequisites
2. **JSON Metadata** (`core-service/data/concepts_metadata.json`): Stores category, difficulty, tags, descriptions

### Service Layer
- `ConceptService` (`service.py`): Business logic
  - `create_concept_extended()`: Create with metadata
  - `list_concepts_paginated()`: Search, filter, and paginate
  - `get_concept_details()`: Get concept with metadata
  - `update_concept()`: Update concept and metadata
  - `delete_concept()`: Delete from both storage systems

- `ConceptStorage` (`storage.py`): JSON metadata persistence
  - `save_concept_metadata()`
  - `get_concept_metadata()`
  - `update_concept_metadata()`
  - `delete_concept_metadata()`
  - `get_all_metadata()`

## Frontend Architecture

### Components
- **ConceptManagement** (`features/concepts/ConceptManagement.tsx`): Main component
  - State management for concepts, filters, modals, toast
  - CRUD operations with API service
  - Pagination logic
  - Authentication handling

### Services
- **concepts.ts** (`services/concepts.ts`): API client
  - TypeScript types for all data structures
  - Fetch-based HTTP requests with JWT auth
  - Error handling with detailed messages

### Routing
- Route: `/concept-management`
- Page wrapper: `pages/concept-management.tsx`
- Navigation: CategoryIcon in sidebar

## Usage

### Creating a Concept
1. Click "+ Add New Concept" button
2. Fill in Concept ID (e.g., "oop_concepts") and Label (required)
3. Optionally add Description, Category, Difficulty, Tags
4. Click "Create Concept"
5. Toast notification confirms success

### Editing a Concept
1. Click "Edit" button on concept card
2. Modify fields (Concept ID is read-only)
3. Click "Update Concept"
4. Changes reflected immediately

### Deleting a Concept
1. Click "Delete" button on concept card
2. Confirm deletion in warning dialog
3. Concept removed from both RDF graph and metadata storage

### Searching and Filtering
1. Type in search bar to filter by label/description
2. Select category dropdown to filter by category
3. Select difficulty dropdown to filter by difficulty
4. Filters update results in real-time
5. Use pagination for large result sets

## Technical Details

### Dependencies
- **Frontend**:
  - React 19
  - TypeScript
  - Tailwind CSS 3.4.0
  - Framer Motion 11.x
  - Headless UI (@headlessui/react)
  - Material-UI v7 (CategoryIcon)

- **Backend**:
  - FastAPI 0.120.4
  - Python 3.13.5
  - RDFlib
  - Pydantic

### File Structure
```
learner-web-app/
├── src/
│   ├── features/
│   │   └── concepts/
│   │       └── ConceptManagement.tsx
│   ├── services/
│   │   └── concepts.ts
│   └── pages/
│       └── concept-management.tsx

core-service/
├── app/
│   └── features/
│       └── concept/
│           ├── router.py
│           ├── service.py
│           └── storage.py
└── data/
    ├── concepts_metadata.json (created on first concept)
    └── graph/
```

### Color Scheme
- **Primary Gradient**: `from-blue-600 to-indigo-700`
- **Success Toast**: Green (#10B981)
- **Error Toast**: Red (#EF4444)
- **Difficulty Colors**:
  - Beginner: Green
  - Intermediate: Yellow
  - Advanced: Orange
  - Expert: Red

## Future Enhancements
- [ ] Bulk operations (multi-select and delete)
- [ ] Import/Export concepts (JSON/CSV)
- [ ] Prerequisite graph visualization
- [ ] Concept versioning and history
- [ ] Advanced search with Boolean operators
- [ ] Drag-and-drop card reordering
- [ ] Concept templates
- [ ] Collaborative editing with real-time updates

## Testing Checklist
- ✅ Authentication required guard works
- ✅ Create concept with all fields
- ✅ Create concept with minimal fields (ID + Label)
- ✅ Edit concept updates metadata
- ✅ Delete concept removes from both storages
- ✅ Search filters results correctly
- ✅ Category filter works
- ✅ Difficulty filter works
- ✅ Pagination navigates pages
- ✅ Toast notifications appear and dismiss
- ✅ Modal animations smooth
- ✅ Card hover effects work
- ✅ Responsive layout on mobile/tablet/desktop
- ✅ TypeScript types enforce data integrity
- ✅ Error handling shows user-friendly messages

## Known Issues
None at this time.

## Contributing
When adding features:
1. Maintain consistent UI design with gradient header and Tailwind styling
2. Add TypeScript types for all new data structures
3. Update backend Pydantic models if changing data schema
4. Include toast notifications for user feedback
5. Test authentication flow and error states
