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
import { glassSx, glassCardSx } from '../common/styles/glass';

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
              background: 'linear-gradient(135deg, rgba(102,126,234,0.85) 0%, rgba(118,75,162,0.85) 100%)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.2)',
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
              background: 'linear-gradient(135deg, rgba(67,233,123,0.85) 0%, rgba(56,249,215,0.85) 100%)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.2)',
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
              background: 'linear-gradient(135deg, rgba(79,172,254,0.85) 0%, rgba(0,242,254,0.85) 100%)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.2)',
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
      <Paper sx={[glassSx, { borderRadius: 3 }]}>
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
                        variant="outlined"
                        sx={{
                          borderRadius: 3,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.12)',
                          },
                        }}
                      >
                        {/* Clickable body */}
                        <CardActionArea onClick={() => handleContinuePath(path.conversation_thread_id)}>
                          <CardContent sx={{ pb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {path.topic || 'Learning Path'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Personalized learning journey
                            </Typography>
                          </CardContent>
                        </CardActionArea>

                        {/* Footer: progress + actions (outside CardActionArea) */}
                        <Box sx={{ px: 2, pb: 2 }}>
                          {/* Progress row */}
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
                              {progressPercent.toFixed(0)}%
                            </Typography>
                          </Stack>

                          {/* Actions row */}
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Button
                              size="small"
                              startIcon={<PlayArrow />}
                              onClick={() => handleContinuePath(path.conversation_thread_id)}
                              sx={{ textTransform: 'none', fontWeight: 500 }}
                            >
                              Continue
                            </Button>
                            <Tooltip title="Delete learning path">
                              <IconButton
                                size="small"
                                aria-label={`Delete ${path.topic || 'learning path'}`}
                                onClick={(e) => handleDeleteClick(e, path)}
                                sx={{
                                  opacity: 0.5,
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    opacity: 1,
                                    bgcolor: 'error.light',
                                    color: 'error.contrastText',
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}

                {/* Add New Path Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderStyle: 'dashed',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <CardActionArea onClick={handleCreatePath} sx={{ height: '100%', minHeight: 160 }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <AddIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
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
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        borderColor: 'success.main',
                        borderLeftWidth: 4,
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                            <CheckCircle color="success" />
                            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                              {path.topic || 'Learning Path'}
                            </Typography>
                          </Stack>
                          <Tooltip title="Delete learning path">
                            <IconButton
                              size="small"
                              aria-label={`Delete ${path.topic || 'learning path'}`}
                              onClick={(e) => handleDeleteClick(e, path)}
                              sx={{
                                opacity: 0.5,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  opacity: 1,
                                  bgcolor: 'error.light',
                                  color: 'error.contrastText',
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
