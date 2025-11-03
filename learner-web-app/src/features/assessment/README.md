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

- `POST /api/assessment/start` - Start new assessment
- `GET /api/assessment/history` - Get user's assessments
- `POST /api/assessment/adaptive/start` - Begin adaptive testing
- `POST /api/assessment/adaptive/{id}/respond` - Submit response
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
