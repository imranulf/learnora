/**
 * Profile Page
 *
 * Unified user profile combining:
 * - Learning preferences and settings
 * - Knowledge state and mastery overview
 *
 * Designed to be personal and encouraging for all learners.
 */
import {
  AccountCircle,
  AutoGraph,
  CheckCircle,
  Psychology,
  Save as SaveIcon,
  School,
  Settings,
  Sync as SyncIcon,
  TrendingUp,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import {
  getLearningInsights,
  getPreferences,
  updatePreferences,
  type LearningInsights,
  type PreferencesUpdate,
} from '../services/preferences';
import {
  getUserKnowledgeDashboard,
  syncWithAssessment,
  type UserKnowledgeItem,
  type UserKnowledgeSummary,
} from '../services/userKnowledge';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CONTENT_FORMATS = ['video', 'article', 'tutorial', 'course', 'documentation', 'podcast'];
const LEARNING_STYLES = ['visual', 'auditory', 'reading', 'kinesthetic', 'balanced'];
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function ProfilePage() {
  const { session, loading: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preferences state
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [preferredFormats, setPreferredFormats] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState('balanced');
  const [availableTime, setAvailableTime] = useState(60);
  const [preferredDifficulty, setPreferredDifficulty] = useState('intermediate');
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [autoEvolve, setAutoEvolve] = useState(true);

  // Knowledge state
  const [knowledgeItems, setKnowledgeItems] = useState<UserKnowledgeItem[]>([]);
  const [knowledgeSummary, setKnowledgeSummary] = useState<UserKnowledgeSummary | null>(null);

  const loadData = useCallback(async () => {
    if (sessionLoading) return;
    if (!session?.access_token) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setError(null);
    try {
      const [prefs, insightsData, knowledgeData] = await Promise.all([
        getPreferences(session.access_token).catch(() => null),
        getLearningInsights(session.access_token).catch(() => null),
        getUserKnowledgeDashboard(session.access_token).catch(() => ({ items: [], summary: null })),
      ]);

      if (prefs) {
        setPreferredFormats(prefs.preferred_formats || []);
        setLearningStyle(prefs.learning_style || 'balanced');
        setAvailableTime(prefs.available_time_daily || 60);
        setPreferredDifficulty(prefs.preferred_difficulty || 'intermediate');
        setLearningGoals(prefs.learning_goals || []);
        setAutoEvolve(prefs.auto_evolve);
      }

      setInsights(insightsData);
      setKnowledgeItems(knowledgeData.items || []);
      setKnowledgeSummary(knowledgeData.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setDataLoading(false);
    }
  }, [session?.access_token, sessionLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePreferences = async () => {
    if (!session?.access_token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: PreferencesUpdate = {
        preferred_formats: preferredFormats,
        learning_style: learningStyle,
        available_time_daily: availableTime,
        preferred_difficulty: preferredDifficulty,
        learning_goals: learningGoals,
        auto_evolve: autoEvolve,
      };

      await updatePreferences(updates, session.access_token);
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncKnowledge = async () => {
    if (!session?.access_token) return;

    setSyncing(true);
    try {
      await syncWithAssessment(session.access_token);
      setSuccess('Knowledge synced with latest assessments!');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleFormat = (format: string) => {
    setPreferredFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const addGoal = () => {
    if (newGoal.trim() && !learningGoals.includes(newGoal.trim())) {
      setLearningGoals([...learningGoals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    setLearningGoals(learningGoals.filter((g) => g !== goal));
  };

  if (sessionLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Get user info from session
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Learner';

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: '2rem',
            }}
          >
            <AccountCircle sx={{ fontSize: 60 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {userName}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {session?.user?.email}
            </Typography>
            {insights?.stats && (
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {insights.stats.learning_streak_days} day streak
                </Typography>
                <Typography variant="body2">
                  {insights.stats.total_interactions} interactions
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
          {success}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              {knowledgeSummary?.total_concepts || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Concepts
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
              {knowledgeSummary?.known || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mastered
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
              {knowledgeSummary?.learning || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Learning
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {Math.round((knowledgeSummary?.average_score || 0) * 100)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Score
            </Typography>
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
            icon={<Settings />}
            iconPosition="start"
            label="Preferences"
            id="profile-tab-0"
            aria-controls="profile-tabpanel-0"
          />
          <Tab
            icon={<Psychology />}
            iconPosition="start"
            label="Knowledge"
            id="profile-tab-1"
            aria-controls="profile-tabpanel-1"
          />
        </Tabs>

        {/* Preferences Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                {/* Preferred Formats */}
                <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Preferred Content Formats
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select the types of content you enjoy learning from
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {CONTENT_FORMATS.map((format) => (
                      <Chip
                        key={format}
                        label={format}
                        onClick={() => toggleFormat(format)}
                        color={preferredFormats.includes(format) ? 'primary' : 'default'}
                        variant={preferredFormats.includes(format) ? 'filled' : 'outlined'}
                        icon={preferredFormats.includes(format) ? <CheckCircle /> : undefined}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    ))}
                  </Box>
                </Paper>

                {/* Learning Style & Difficulty */}
                <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Learning Style</InputLabel>
                        <Select
                          value={learningStyle}
                          onChange={(e) => setLearningStyle(e.target.value)}
                          label="Learning Style"
                        >
                          {LEARNING_STYLES.map((style) => (
                            <MenuItem key={style} value={style}>
                              {style.charAt(0).toUpperCase() + style.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Preferred Difficulty</InputLabel>
                        <Select
                          value={preferredDifficulty}
                          onChange={(e) => setPreferredDifficulty(e.target.value)}
                          label="Preferred Difficulty"
                        >
                          {DIFFICULTY_LEVELS.map((level) => (
                            <MenuItem key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Daily Learning Time */}
                <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <TrendingUp color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Daily Learning Time
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    I can dedicate about {availableTime} minutes per day
                  </Typography>
                  <Slider
                    value={availableTime}
                    onChange={(_, value) => setAvailableTime(value as number)}
                    min={15}
                    max={240}
                    step={15}
                    marks={[
                      { value: 15, label: '15m' },
                      { value: 60, label: '1h' },
                      { value: 120, label: '2h' },
                      { value: 240, label: '4h' },
                    ]}
                  />
                </Paper>

                {/* Learning Goals */}
                <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <School color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Learning Goals
                    </Typography>
                  </Stack>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Add a learning goal..."
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                    />
                    <Button variant="contained" onClick={addGoal}>
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {learningGoals.map((goal) => (
                      <Chip
                        key={goal}
                        label={goal}
                        onDelete={() => removeGoal(goal)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {learningGoals.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No goals set yet. Add your first goal above!
                      </Typography>
                    )}
                  </Box>
                </Paper>

                {/* Auto-Evolve */}
                <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AutoGraph color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Auto-Evolve Preferences
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Automatically adapt based on your learning behavior
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoEvolve}
                          onChange={(e) => setAutoEvolve(e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </Stack>
                </Paper>

                {/* Save Button */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSavePreferences}
                  disabled={saving}
                  startIcon={<SaveIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    py: 1.5,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </Grid>

              {/* Stats Sidebar */}
              <Grid size={{ xs: 12, md: 4 }}>
                {insights?.stats && (
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Learning Stats
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Completion Rate
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={insights.stats.completion_rate}
                          sx={{ height: 8, borderRadius: 4, my: 1 }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {insights.stats.completion_rate.toFixed(0)}%
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Learning Streak
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {insights.stats.learning_streak_days} days
                        </Typography>
                      </Box>

                      {insights.stats.average_rating && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Average Rating
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {insights.stats.average_rating.toFixed(1)} / 5.0
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Knowledge Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                onClick={handleSyncKnowledge}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync with Assessments'}
              </Button>
            </Box>

            {knowledgeItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Psychology sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No knowledge data yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                  Take an assessment or complete some learning activities to start tracking your knowledge.
                </Typography>
                <Button variant="contained" onClick={handleSyncKnowledge} disabled={syncing}>
                  Sync with Assessments
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {knowledgeItems.slice(0, 12).map((item) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderLeftWidth: 4,
                        borderLeftColor:
                          item.mastery === 'known'
                            ? 'success.main'
                            : item.mastery === 'learning'
                            ? 'warning.main'
                            : 'grey.400',
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {item.concept}
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mt: 1 }}
                      >
                        <Chip
                          label={item.mastery.replace('_', ' ')}
                          size="small"
                          color={
                            item.mastery === 'known'
                              ? 'success'
                              : item.mastery === 'learning'
                              ? 'warning'
                              : 'default'
                          }
                          sx={{ textTransform: 'capitalize' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(item.score * 100)}%
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}

            {knowledgeItems.length > 12 && (
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing 12 of {knowledgeItems.length} concepts
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
