# Assessment Feature

Dynamic Knowledge Evaluation (DKE) system integrated into Learnora with adaptive testing, knowledge tracing, and AI-powered learning path generation.

## Components

### AssessmentPanel
Main assessment interface displaying mastery levels and learning gaps.

```tsx
import { AssessmentPanel } from '@/features/assessment';

<AssessmentPanel
  assessments={assessmentHistory}
  onAssessmentComplete={() => {
    // Refresh data
  }}
/>
```

**Features:**
- Start new assessments
- View latest mastery scores
- Display learning gaps with priorities
- Show theta (IRT ability) estimates

### AssessmentWizard
AI-powered conversational assessment wizard.

```tsx
import { AssessmentWizard } from '@/features/assessment';

<AssessmentWizard
  open={wizardOpen}
  onClose={() => setWizardOpen(false)}
  onComplete={(result) => {
    console.log('Learning path created:', result);
  }}
/>
```

**Features:**
- 4-step wizard flow
- AI conversation for assessment
- Knowledge graph generation
- Progress visualization

### ReassessmentSummary
Compact summary of reassessment results.

```tsx
import { ReassessmentSummary } from '@/features/assessment';

<ReassessmentSummary
  data={{
    mastery_delta: { 'algebra': 0.15, 'calculus': -0.05 },
    reassessment: { theta: 1.234, ability_delta: 0.089 }
  }}
/>
```

## API Usage

### Start Assessment
```typescript
import { assessmentAPI } from '@/features/assessment';

const result = await assessmentAPI.startAssessment('mathematics');
console.log('Theta:', result.theta_estimate);
```

### AI Learning Path
```typescript
// Start conversation
const response = await assessmentAPI.startLearningPath('Machine Learning');
const threadId = response.thread_id;

// Continue conversation
const nextResponse = await assessmentAPI.respondToLearningPath(
  threadId,
  'I want to focus on neural networks'
);

// Get knowledge graph
if (nextResponse.assessment_complete) {
  const graph = nextResponse.knowledge_graph;
  console.log('Concepts:', graph['@graph']);
}
```

### Adaptive Testing
```typescript
// Start adaptive session
const session = await assessmentAPI.startAdaptiveSession('algebra');

// Submit answers
const next = await assessmentAPI.submitAdaptiveResponse(session.assessment_id, {
  item_id: session.next_item.id,
  response: 'answer',
  is_correct: true,
  time_spent: 30
});

if (next.is_complete) {
  console.log('Final theta:', next.current_theta);
}
```

### Adaptive Quiz (IRT 2PL + BKT)
```typescript
// Create adaptive quiz - items selected based on user's ability
const quiz = await fetch('/api/v1/assessment/quizzes', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Python Basics Quiz',
    skill: 'python',
    difficulty: 'intermediate',
    total_items: 10,
    is_adaptive: true  // Uses CAT for item selection
  })
});

// Option A: Submit all at once
const result = await fetch(`/api/v1/assessment/quizzes/${quiz.id}/submit`, {
  method: 'POST',
  body: JSON.stringify({
    responses: [
      { item_id: 1, selected_index: 2 },
      { item_id: 2, selected_index: 0 },
      // ...
    ]
  })
});
// Returns: theta_estimate, theta_se, mastery_updated, score

// Option B: Item-by-item adaptive (real-time theta updates)
let nextItem = await fetch(`/api/v1/assessment/quizzes/${quiz.id}/next-item`);

while (!nextItem.is_last) {
  // Show item to user, get response
  const response = await fetch(`/api/v1/assessment/quizzes/${quiz.id}/respond-item`, {
    method: 'POST',
    body: JSON.stringify({ item_id: nextItem.item_code, selected_index: userAnswer })
  });

  console.log('Updated theta:', response.new_theta);
  console.log('Items remaining:', response.items_remaining);

  // Get next item (selected based on updated theta)
  nextItem = await fetch(`/api/v1/assessment/quizzes/${quiz.id}/next-item`);
}
```

### MCQ Generation
```typescript
// Generate questions for a concept
const mcqs = await fetch('/api/v1/assessment/mcq/generate', {
  method: 'POST',
  body: JSON.stringify({
    concept_name: 'Binary Search Trees',
    difficulty: 'Intermediate',
    question_count: 5,
    learning_path_thread_id: 'optional-thread-id'  // For prerequisite context
  })
});

// Generate and save to item bank
const saved = await fetch('/api/v1/assessment/mcq/generate-and-save', {
  method: 'POST',
  body: JSON.stringify({
    concept_name: 'Recursion',
    skill: 'algorithms',
    difficulty: 'Advanced',
    question_count: 10
  })
});
console.log('Saved items:', saved.item_codes);
```

## Types

### AssessmentResult
```typescript
interface AssessmentResult {
  id: number;
  user_id: number;
  skill_domain: string;
  theta_estimate: number | null;
  theta_se: number | null;
  status: 'in_progress' | 'completed';
  mastery_scores?: Record<string, number>;
  learning_gaps?: LearningGap[];
}
```

### LearningGap
```typescript
interface LearningGap {
  skill: string;
  mastery_level: number;
  priority: 'low' | 'medium' | 'high';
  recommended_difficulty: string;
}
```

### QuizResult (NEW)
```typescript
interface QuizResult {
  id: number;
  quiz_id: number;
  score: number;              // 0.0 to 1.0
  correct_count: number;
  total_count: number;
  time_taken_minutes?: number;
  created_at: string;

  // IRT ability estimates
  theta_estimate?: number;    // Updated ability after quiz
  theta_se?: number;          // Standard error
  theta_before?: number;      // Ability before quiz
  mastery_updated: boolean;   // Whether BKT was updated
}
```

### AdaptiveItemResponse (NEW)
```typescript
interface AdaptiveItemResponse {
  is_correct: boolean;
  correct_index: number;
  explanation?: string;
  new_theta: number;          // Updated ability estimate
  new_se: number;             // Standard error
  items_answered: number;
  items_remaining: number;
  quiz_complete: boolean;
}
```

### KnowledgeGraph
```typescript
interface KnowledgeGraph {
  '@context': string;
  '@graph': KnowledgeGraphConcept[];
}

interface KnowledgeGraphConcept {
  '@id': string;
  '@type': string;
  name: string;
  difficulty: string;
  prerequisites?: string[];
}
```

## Styling

All components use Material-UI and respect the application theme:

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

<ThemeProvider theme={theme}>
  <AssessmentPanel />
</ThemeProvider>
```

## Backend Integration

Requires the following backend endpoints to be available:

### Assessment Sessions (CAT-based)
- `POST /api/v1/assessment/sessions` - Start new assessment session
- `GET /api/v1/assessment/sessions` - Get user's assessments
- `GET /api/v1/assessment/sessions/{id}/next-item` - Get next adaptive item
- `POST /api/v1/assessment/sessions/{id}/respond` - Submit response with IRT update

### Adaptive Quizzes (NEW)
- `POST /api/v1/assessment/quizzes` - Create quiz (adaptive or fixed)
- `GET /api/v1/assessment/quizzes` - List user's quizzes
- `GET /api/v1/assessment/quizzes/{id}` - Get quiz details
- `GET /api/v1/assessment/quizzes/{id}/items` - Get all quiz items
- `POST /api/v1/assessment/quizzes/{id}/submit` - Submit quiz (updates theta + BKT)
- `GET /api/v1/assessment/quizzes/{id}/results` - Get quiz results history

### Item-by-Item Adaptive Testing (NEW)
- `GET /api/v1/assessment/quizzes/{id}/next-item` - Get next CAT-selected item
- `POST /api/v1/assessment/quizzes/{id}/respond-item` - Submit single response (updates theta)

### MCQ Generation (AI-powered)
- `POST /api/v1/assessment/mcq/generate` - Generate MCQs for a concept
- `POST /api/v1/assessment/mcq/generate-and-save` - Generate and save to item bank

### Knowledge State
- `GET /api/v1/assessment/knowledge-state` - Get BKT mastery probabilities
- `GET /api/v1/assessment/learning-gaps` - Get identified learning gaps

### AI Learning Path
- `GET /api/ai/status` - Check AI availability
- `POST /api/ai/learning-path/start` - Start AI assessment
- `POST /api/ai/learning-path/respond` - Continue AI conversation

## Configuration

Set the API base URL in your environment:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Or update directly in `api.ts`:
```typescript
const API_BASE_URL = 'https://your-api-server.com';
```

## Authentication

The API service automatically includes JWT tokens from localStorage:

```typescript
// Login and store token
localStorage.setItem('auth_token', token);

// API calls will include: Authorization: Bearer {token}
```

## Development

### Install Dependencies
```bash
cd learner-web-app
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## Troubleshooting

### API Connection Failed
- Ensure backend server is running on port 8000
- Check CORS settings in FastAPI
- Verify auth token is valid

### TypeScript Errors
- Run `npm install` to ensure dependencies are up to date
- Check `tsconfig.json` for strict mode settings

### AI Features Not Available
- Verify `GOOGLE_API_KEY` is set in backend `.env`
- Check `/api/ai/status` endpoint response
- Review backend logs for API errors

## License

Part of the Learnora learning platform.
