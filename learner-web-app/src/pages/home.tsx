/**
 * Home Page (Dashboard)
 *
 * The central hub for learners featuring:
 * - Personalized welcome and quick stats
 * - "What to do next" guidance
 * - Quick access to all core features
 *
 * Designed to be welcoming and clear for learners of all backgrounds.
 */
import {
  Add as AddIcon,
  AutoStories,
  CheckCircle,
  EmojiEvents,
  ErrorOutline,
  Explore,
  PlayArrow,
  Psychology,
  Quiz,
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
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { useDashboardStats, useLearningPaths } from '../hooks/useApiQueries';
import { getPathProgress, type PathProgress } from '../services/learningPathProgress';
import { glassSx, glassCardSx } from '../common/styles/glass';

const PAGE_TITLE = 'Home - Learnora';

export default function HomePage() {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const userName = session?.user?.first_name || session?.user?.name || session?.user?.email?.split('@')[0] || 'Learner';

  const token = session?.access_token;
  const { data: stats = null, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats(token);
  const { data: paths = [], isLoading: pathsLoading, error: pathsError, refetch: refetchPaths } = useLearningPaths(token);

  // Fetch progress for the first 3 paths
  const top3ThreadIds = useMemo(
    () => paths.slice(0, 3).map((p) => p.conversation_thread_id),
    [paths],
  );

  const { data: progress = {} } = useQuery<Record<string, PathProgress>>({
    queryKey: ['home-progress', ...top3ThreadIds],
    queryFn: async () => {
      if (!token || top3ThreadIds.length === 0) return {};
      const progressMap: Record<string, PathProgress> = {};
      for (const threadId of top3ThreadIds) {
        try {
          progressMap[threadId] = await getPathProgress(threadId, token);
        } catch {
          // Progress might not exist yet
        }
      }
      return progressMap;
    },
    enabled: !!token && top3ThreadIds.length > 0,
    staleTime: 30_000,
  });

  const dataLoading = statsLoading || pathsLoading;
  const error = statsError || pathsError;
  const fetchData = () => { refetchStats(); refetchPaths(); };

  useEffect(() => { document.title = PAGE_TITLE; }, []);

  // Determine what to suggest next
  const getNextSuggestion = () => {
    const activePaths = paths.filter((p) => progress[p.conversation_thread_id]?.overall_progress !== 100);

    if (paths.length === 0) {
      return {
        type: 'new-path',
        title: 'Create Your First Learning Path',
        description: 'Tell us what you want to learn and we\'ll create a personalized path just for you.',
        action: () => navigate('/learn'),
        icon: <AddIcon />,
      };
    }

    if (activePaths.length > 0) {
      const nextPath = activePaths[0];
      const nextProgress = progress[nextPath.conversation_thread_id]?.overall_progress || 0;
      return {
        type: 'continue',
        title: `Continue: ${nextPath.topic || 'Learning Path'}`,
        description: `You're ${nextProgress.toFixed(0)}% through this path. Keep going!`,
        action: () => navigate(`/learning-path?thread=${nextPath.conversation_thread_id}`),
        icon: <PlayArrow />,
      };
    }

    return {
      type: 'practice',
      title: 'Practice Your Skills',
      description: 'Take a quiz to reinforce what you\'ve learned.',
      action: () => navigate('/practice'),
      icon: <Quiz />,
    };
  };

  const nextSuggestion = getNextSuggestion();

  // Show loading while session or data is loading
  if (sessionLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          icon={<ErrorOutline />}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Failed to load dashboard'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Section with Next Step */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome back, {userName}!
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
              Ready to continue your learning journey?
            </Typography>

            {/* Primary Call to Action */}
            <Button
              variant="contained"
              size="large"
              startIcon={nextSuggestion.icon}
              onClick={nextSuggestion.action}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {nextSuggestion.title}
            </Button>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              {nextSuggestion.description}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats?.active_paths ?? paths.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Learning Paths
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats?.concepts_learned ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Concepts
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats?.average_progress?.toFixed(0) ?? 0}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Progress
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Navigation Cards */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        What would you like to do?
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { path: '/learn', icon: <AutoStories sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />, label: 'Learn', desc: 'Continue your paths' },
          { path: '/practice', icon: <Quiz sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />, label: 'Practice', desc: 'Test your skills' },
          { path: '/discover', icon: <Explore sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />, label: 'Discover', desc: 'Find new content' },
          { path: '/profile', icon: <Psychology sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />, label: 'Profile', desc: 'Your progress' },
        ].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item.path}>
            <Card
              sx={[glassCardSx(), { height: '100%' }]}
            >
              <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%', p: 2 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  {item.icon}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.desc}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={3}>
        {/* Active Learning Paths */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={[glassSx, { p: 3, borderRadius: 3 }]}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Learning Paths
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/learn')}
                sx={{ textTransform: 'none' }}
              >
                View All
              </Button>
            </Stack>

            {paths.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <School sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Start Your Learning Journey
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Create a personalized learning path based on what you want to learn.
                  Our AI will guide you step by step.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/learn')}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  Create Learning Path
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {paths.slice(0, 3).map((path) => {
                  const pathProgress = progress[path.conversation_thread_id]?.overall_progress || 0;
                  const isCompleted = pathProgress === 100;

                  return (
                    <Card
                      key={path.conversation_thread_id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                      }}
                    >
                      <CardActionArea
                        onClick={() => navigate(`/learning-path?thread=${path.conversation_thread_id}`)}
                        sx={{ p: 2 }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {path.topic || 'Learning Path'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Personalized learning journey
                            </Typography>
                          </Box>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            {isCompleted ? (
                              <Chip
                                icon={<CheckCircle />}
                                label="Completed"
                                color="success"
                                size="small"
                              />
                            ) : (
                              <Box sx={{ minWidth: 100 }}>
                                <Typography variant="body2" color="text.secondary" align="right">
                                  {pathProgress.toFixed(0)}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={pathProgress}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            )}
                          </Stack>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Achievements / Encouragement */}
          <Paper sx={[glassSx, { p: 3, borderRadius: 3, mb: 3 }]}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <EmojiEvents color="warning" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Achievements
              </Typography>
            </Stack>

            {(stats?.concepts_learned ?? 0) > 0 ? (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp color="success" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {stats?.concepts_learned} Concepts Learned
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Keep up the great work!
                    </Typography>
                  </Box>
                </Box>

                {(stats?.assessments_completed ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Quiz color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stats?.assessments_completed} Assessments Completed
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Testing your knowledge
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Complete lessons and quizzes to earn achievements!
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Quick Tips */}
          <Paper sx={[glassSx, { p: 3, borderRadius: 3 }]}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Learning Tips
            </Typography>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Set a daily goal and stick to it - even 15 minutes helps!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Take practice quizzes to reinforce what you learn.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Don't rush - understanding is more important than speed.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
