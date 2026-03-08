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
  Delete as DeleteIcon,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { useLearningPaths, useDeleteLearningPath } from '../hooks/useApiQueries';
import { getPathProgress, type PathProgress } from '../services/learningPathProgress';
import type { LearningPathResponse } from '../services/learningPath';

const PAGE_TITLE = 'Learn - Learnora';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<LearningPathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = session?.access_token;
  const { data: paths = [], isLoading: pathsLoading, refetch: refetchPaths } = useLearningPaths(token);
  const deleteMutation = useDeleteLearningPath(token);

  // Fetch progress for all paths
  const allThreadIds = useMemo(
    () => paths.map((p) => p.conversation_thread_id),
    [paths],
  );

  const { data: progress = {} } = useQuery<Record<string, PathProgress>>({
    queryKey: ['learn-progress', ...allThreadIds],
    queryFn: async () => {
      if (!token || allThreadIds.length === 0) return {};
      const progressMap: Record<string, PathProgress> = {};
      for (const threadId of allThreadIds) {
        try {
          progressMap[threadId] = await getPathProgress(threadId, token);
        } catch {
          // Progress might not exist yet
        }
      }
      return progressMap;
    },
    enabled: !!token && allThreadIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => { document.title = PAGE_TITLE; }, []);

  const fetchData = () => { refetchPaths(); };

  const handleCreatePath = () => {
    navigate('/learning-path');
  };

  const handleContinuePath = (threadId: string) => {
    navigate(`/learning-path?thread=${threadId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, path: LearningPathResponse) => {
    e.stopPropagation();
    setPathToDelete(path);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pathToDelete) return;

    try {
      await deleteMutation.mutateAsync(pathToDelete.conversation_thread_id);
      setDeleteDialogOpen(false);
      setPathToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete learning path');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPathToDelete(null);
  };

  if (sessionLoading || pathsLoading) {
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
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
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
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                        }}
                      >
                        {/* Delete Button */}
                        <Tooltip title="Delete learning path">
                          <IconButton
                            size="small"
                            aria-label={`Delete ${path.topic || 'learning path'}`}
                            onClick={(e) => handleDeleteClick(e, path)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'error.light',
                                color: 'error.contrastText',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <CardActionArea onClick={() => handleContinuePath(path.conversation_thread_id)}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ flex: 1, pr: 4 }}>
                                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
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
                    <Card
                      sx={{
                        borderRadius: 3,
                        bgcolor: 'success.light',
                        position: 'relative',
                      }}
                    >
                      {/* Delete Button */}
                      <Tooltip title="Delete learning path">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${path.topic || 'learning path'}`}
                          onClick={(e) => handleDeleteClick(e, path)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1,
                            bgcolor: 'background.paper',
                            '&:hover': {
                              bgcolor: 'error.light',
                              color: 'error.contrastText',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Learning Path?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "<strong>{pathToDelete?.topic || 'this learning path'}</strong>"?
            This action cannot be undone and all progress will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
