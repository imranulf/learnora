/**
 * Practice Page
 *
 * Unified practice hub combining:
 * - Skill assessments (initial & reassessment)
 * - Quick quizzes (adaptive & standard)
 *
 * Designed to be encouraging and accessible for all learners.
 */
import {
  Add as AddIcon,
  EmojiEvents,
  PlayArrow,
  Psychology,
  Quiz as QuizIcon,
  School,
  TrendingUp,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  AssessmentPanel,
  AssessmentWizard,
  QuizPlayer,
  QuizResults,
} from '../features/assessment';
import {
  createQuiz,
  listAssessmentSessions,
  listQuizzes,
} from '../features/assessment/api';
import type {
  AssessmentResponse,
  QuizResponse,
  QuizResultResponse,
} from '../features/assessment/types';
import { useSession } from '../hooks/useSession';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`practice-tabpanel-${index}`}
      aria-labelledby={`practice-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Quick quiz skill options
const QUICK_QUIZ_SKILLS = [
  { skill: 'python', label: 'Python', color: '#3776ab' },
  { skill: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { skill: 'data-science', label: 'Data Science', color: '#43a047' },
  { skill: 'machine-learning', label: 'Machine Learning', color: '#7c4dff' },
];

export default function PracticePage() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assessment state
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizResponse[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizResponse | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResultResponse | null>(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.access_token) return;

      try {
        setLoading(true);
        setError(null);

        const [assessmentData, quizData] = await Promise.all([
          listAssessmentSessions().catch(() => []),
          listQuizzes().catch(() => []),
        ]);

        setAssessments(assessmentData);
        setQuizzes(quizData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load practice data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.access_token]);

  const handleRefresh = async () => {
    const [assessmentData, quizData] = await Promise.all([
      listAssessmentSessions().catch(() => []),
      listQuizzes().catch(() => []),
    ]);
    setAssessments(assessmentData);
    setQuizzes(quizData);
  };

  // Quick quiz creation
  const handleQuickQuiz = async (skill: string) => {
    setCreatingQuiz(true);
    try {
      const quiz = await createQuiz({
        title: `Quick ${skill} Quiz`,
        skill,
        difficulty: 'intermediate',
        total_items: 5,
        is_adaptive: true,
      });
      setActiveQuiz(quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setCreatingQuiz(false);
    }
  };

  const handleQuizComplete = (result: QuizResultResponse) => {
    setQuizResult(result);
    setActiveQuiz(null);
  };

  const handleCloseResults = () => {
    setQuizResult(null);
    handleRefresh();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const completedAssessments = assessments.filter((a) => a.status === 'completed').length;
  const completedQuizzes = quizzes.filter((q) => q.status === 'completed').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Practice & Improve
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Test your knowledge and track your growth
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <Psychology sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {assessments.length}
            </Typography>
            <Typography variant="body2">Skill Assessments</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <QuizIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {quizzes.length}
            </Typography>
            <Typography variant="body2">Quizzes Taken</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
              color: '#333',
              borderRadius: 3,
            }}
          >
            <EmojiEvents sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {completedAssessments + completedQuizzes}
            </Typography>
            <Typography variant="body2">Completed</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Quiz Section */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <PlayArrow color="primary" />
          <Typography variant="h6">Quick Practice</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Start a 5-question adaptive quiz to test your skills
        </Typography>
        <Grid container spacing={2}>
          {QUICK_QUIZ_SKILLS.map((item) => (
            <Grid size={{ xs: 6, sm: 3 }} key={item.skill}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: item.color,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleQuickQuiz(item.skill)}
                  disabled={creatingQuiz}
                  sx={{ p: 2, textAlign: 'center' }}
                >
                  <School sx={{ fontSize: 32, color: item.color, mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {item.label}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        {creatingQuiz && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Paper>

      {/* Tabs for Assessments and Quiz History */}
      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={`Skill Assessments (${assessments.length})`}
            id="practice-tab-0"
            aria-controls="practice-tabpanel-0"
          />
          <Tab
            label={`Quiz History (${quizzes.length})`}
            id="practice-tab-1"
            aria-controls="practice-tabpanel-1"
          />
        </Tabs>

        {/* Assessments Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setWizardOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                New Assessment
              </Button>
            </Box>

            {assessments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Psychology sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No assessments yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Take a skill assessment to discover your current level and get personalized recommendations.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setWizardOpen(true)}
                >
                  Start Your First Assessment
                </Button>
              </Box>
            ) : (
              <AssessmentPanel
                assessments={assessments}
                onAssessmentComplete={handleRefresh}
              />
            )}
          </Box>
        </TabPanel>

        {/* Quiz History Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            {quizzes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <QuizIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No quizzes yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use Quick Practice above to take your first quiz!
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {quizzes.map((quiz) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={quiz.id}>
                    <Card sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {quiz.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {quiz.skill}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={quiz.difficulty}
                              size="small"
                              variant="outlined"
                            />
                            {quiz.is_adaptive && (
                              <Chip
                                label="Adaptive"
                                size="small"
                                color="primary"
                              />
                            )}
                          </Stack>
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            {quiz.total_items} questions
                          </Typography>
                          {quiz.status === 'completed' && (
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                              <TrendingUp color="success" fontSize="small" />
                              <Typography variant="body2" color="success.main">
                                Completed
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Assessment Wizard Dialog */}
      <AssessmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={() => {
          setWizardOpen(false);
          handleRefresh();
        }}
      />

      {/* Active Quiz Dialog */}
      <Dialog
        open={!!activeQuiz}
        onClose={() => setActiveQuiz(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {activeQuiz?.title}
          <IconButton
            aria-label="close"
            onClick={() => setActiveQuiz(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {activeQuiz && (
            <QuizPlayer
              quiz={activeQuiz}
              onComplete={handleQuizComplete}
              onCancel={() => setActiveQuiz(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Results Dialog */}
      <Dialog
        open={!!quizResult}
        onClose={handleCloseResults}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          {quizResult && (
            <QuizResults
              result={quizResult}
              onClose={handleCloseResults}
              onRetry={() => {
                setQuizResult(null);
                // Could restart same quiz type here
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
