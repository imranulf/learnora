/**
 * Learn Page
 *
 * Unified learning experience combining:
 * - Learning path visualization
 * - Progress tracking
 * - Knowledge graph (embedded)
 *
 * Designed to be simple and encouraging for all learners.
 */
import {
  Add as AddIcon,
  AutoStories,
  CheckCircle,
  PlayArrow,
  Timeline,
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
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { getAllLearningPaths, type LearningPathResponse } from '../services/learningPath';
import { getPathProgress, type PathProgress } from '../services/learningPathProgress';

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
      id={`learn-tabpanel-${index}`}
      aria-labelledby={`learn-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LearnPage() {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [paths, setPaths] = useState<LearningPathResponse[]>([]);
  const [progress, setProgress] = useState<Record<string, PathProgress>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (sessionLoading) return;
      if (!session?.access_token) {
        setDataLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        setError(null);

        // Fetch learning paths
        const pathsData = await getAllLearningPaths(session.access_token);
        setPaths(pathsData);

        // Fetch progress for each path
        const progressMap: Record<string, PathProgress> = {};
        for (const path of pathsData) {
          try {
            const pathProgress = await getPathProgress(
              session.access_token,
              path.conversation_thread_id
            );
            progressMap[path.conversation_thread_id] = pathProgress;
          } catch {
            // Progress might not exist yet
          }
        }
        setProgress(progressMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load learning data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [session?.access_token, sessionLoading]);

  const handleCreatePath = () => {
    navigate('/learning-path');
  };

  const handleContinuePath = (threadId: string) => {
    navigate(`/learning-path?thread=${threadId}`);
  };

  if (sessionLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activePaths = paths.filter((p) => progress[p.conversation_thread_id]?.overall_progress !== 100);
  const completedPaths = paths.filter((p) => progress[p.conversation_thread_id]?.overall_progress === 100);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Your Learning Journey
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your progress and continue where you left off
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <AutoStories sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {paths.length}
            </Typography>
            <Typography variant="body2">Learning Paths</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {completedPaths.length}
            </Typography>
            <Typography variant="body2">Completed</Typography>
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
            <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {activePaths.length}
            </Typography>
            <Typography variant="body2">In Progress</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={`In Progress (${activePaths.length})`}
            id="learn-tab-0"
            aria-controls="learn-tabpanel-0"
          />
          <Tab
            label={`Completed (${completedPaths.length})`}
            id="learn-tab-1"
            aria-controls="learn-tabpanel-1"
          />
        </Tabs>

        {/* In Progress Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            {activePaths.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <AutoStories sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Ready to start learning?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Create a personalized learning path based on your goals.
                  Our AI will guide you step by step.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleCreatePath}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Create Learning Path
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {activePaths.map((path) => {
                  const pathProgress = progress[path.conversation_thread_id];
                  const progressPercent = pathProgress?.overall_progress || 0;

                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={path.conversation_thread_id}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                        }}
                      >
                        <CardActionArea onClick={() => handleContinuePath(path.conversation_thread_id)}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                  {path.topic || 'Learning Path'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  Personalized learning journey
                                </Typography>
                              </Box>
                              <Chip
                                icon={<Timeline />}
                                label={`${progressPercent.toFixed(0)}%`}
                                color={progressPercent > 50 ? 'success' : 'primary'}
                                size="small"
                              />
                            </Stack>

                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{ height: 8, borderRadius: 4, mb: 2 }}
                            />

                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PlayArrow />}
                              sx={{ textTransform: 'none' }}
                            >
                              Continue Learning
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}

                {/* Add New Path Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '2px dashed',
                      borderColor: 'divider',
                      bgcolor: 'transparent',
                    }}
                  >
                    <CardActionArea onClick={handleCreatePath} sx={{ height: '100%', minHeight: 180 }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="h6" color="text.secondary">
                          New Learning Path
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start a new topic
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Completed Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            {completedPaths.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircle sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No completed paths yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keep learning! Your completed paths will appear here.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {completedPaths.map((path) => (
                  <Grid size={{ xs: 12, md: 6 }} key={path.conversation_thread_id}>
                    <Card sx={{ borderRadius: 3, bgcolor: 'success.light' }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <CheckCircle sx={{ color: 'success.main', fontSize: 40 }} />
                          <Box>
                            <Typography variant="h6">
                              {path.topic || 'Learning Path'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Completed!
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
