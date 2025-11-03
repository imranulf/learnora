import {
    AutoGraph as AutoGraphIcon,
    Check as CheckIcon,
    Psychology as PsychologyIcon,
    Save as SaveIcon,
    Schedule as ScheduleIcon,
    School as SchoolIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Slider,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import {
    getLearningInsights,
    getPreferences,
    updatePreferences,
    type LearningInsights,
    type PreferencesUpdate
} from '../services/preferences';

const CONTENT_FORMATS = ['video', 'article', 'tutorial', 'course', 'documentation', 'podcast'];
const LEARNING_STYLES = ['visual', 'auditory', 'reading', 'kinesthetic', 'balanced'];
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function PreferencesSettings() {
    const { session } = useSession();
    const [insights, setInsights] = useState<LearningInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [preferredFormats, setPreferredFormats] = useState<string[]>([]);
    const [learningStyle, setLearningStyle] = useState('balanced');
    const [availableTime, setAvailableTime] = useState(60);
    const [preferredDifficulty, setPreferredDifficulty] = useState('intermediate');
    const [learningGoals, setLearningGoals] = useState<string[]>([]);
    const [newGoal, setNewGoal] = useState('');
    const [autoEvolve, setAutoEvolve] = useState(true);

    const loadData = useCallback(async () => {
        if (!session?.access_token) {
            setError('Please log in to view preferences');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [prefs, insightsData] = await Promise.all([
                getPreferences(session.access_token),
                getLearningInsights(session.access_token)
            ]);

            setInsights(insightsData);

            // Update form state from preferences
            setPreferredFormats(prefs.preferred_formats || []);
            setLearningStyle(prefs.learning_style || 'balanced');
            setAvailableTime(prefs.available_time_daily || 60);
            setPreferredDifficulty(prefs.preferred_difficulty || 'intermediate');
            setLearningGoals(prefs.learning_goals || []);
            setAutoEvolve(prefs.auto_evolve);
        } catch (err) {
            console.error('Failed to load preferences:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences';
            setError(`${errorMessage}. Please make sure the backend is running on http://localhost:8000`);
        } finally {
            setLoading(false);
        }
    }, [session?.access_token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        if (!session?.access_token) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const updates: PreferencesUpdate = {
                preferred_formats: preferredFormats,
                learning_style: learningStyle,
                available_time_daily: availableTime,
                preferred_difficulty: preferredDifficulty,
                learning_goals: learningGoals,
                auto_evolve: autoEvolve
            };

            await updatePreferences(updates, session.access_token);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

            // Reload to get updated insights
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const toggleFormat = (format: string) => {
        setPreferredFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        );
    };

    const addGoal = () => {
        if (newGoal.trim() && !learningGoals.includes(newGoal.trim())) {
            setLearningGoals([...learningGoals, newGoal.trim()]);
            setNewGoal('');
        }
    };

    const removeGoal = (goal: string) => {
        setLearningGoals(learningGoals.filter(g => g !== goal));
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <LinearProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    <PsychologyIcon sx={{ fontSize: 32, mr: 1, verticalAlign: 'middle' }} />
                    Learning Preferences
                </Typography>
                <Typography color="text.secondary">
                    Customize your learning experience. Your preferences evolve automatically based on your interactions.
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
                    Preferences saved successfully!
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Left Column - Settings */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {/* Preferred Formats */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Preferred Content Formats
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Select the types of content you prefer
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {CONTENT_FORMATS.map((format) => (
                                <Chip
                                    key={format}
                                    label={format}
                                    onClick={() => toggleFormat(format)}
                                    color={preferredFormats.includes(format) ? 'primary' : 'default'}
                                    variant={preferredFormats.includes(format) ? 'filled' : 'outlined'}
                                    icon={preferredFormats.includes(format) ? <CheckIcon /> : undefined}
                                />
                            ))}
                        </Box>
                    </Paper>

                    {/* Learning Style & Difficulty */}
                    <Paper sx={{ p: 3, mb: 3 }}>
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

                    {/* Available Time */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <ScheduleIcon sx={{ mr: 1 }} />
                            <Typography variant="h6" fontWeight="bold">
                                Daily Learning Time
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Average minutes available per day: {availableTime} min
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
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <SchoolIcon sx={{ mr: 1 }} />
                            <Typography variant="h6" fontWeight="bold">
                                Learning Goals
                            </Typography>
                        </Box>
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
                        </Box>
                    </Paper>

                    {/* Auto-Evolve */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <AutoGraphIcon sx={{ mr: 1 }} />
                                    <Typography variant="h6" fontWeight="bold">
                                        Auto-Evolve Preferences
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    Automatically update preferences based on your interactions and behavior
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
                        </Box>
                    </Paper>

                    {/* Save Button */}
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={<SaveIcon />}
                    >
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </Grid>

                {/* Right Column - Insights */}
                <Grid size={{ xs: 12, md: 4 }}>
                    {insights && (
                        <>
                            {/* Stats Card */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <TrendingUpIcon sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            Learning Stats
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Interactions
                                        </Typography>
                                        <Typography variant="h4" fontWeight="bold">
                                            {insights.stats.total_interactions}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Completion Rate
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={insights.stats.completion_rate}
                                            sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {insights.stats.completion_rate.toFixed(1)}%
                                        </Typography>
                                    </Box>

                                    {insights.stats.average_rating && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Average Rating
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                ⭐ {insights.stats.average_rating.toFixed(1)} / 5.0
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Learning Streak
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            🔥 {insights.stats.learning_streak_days} days
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Knowledge Areas */}
                            {Object.keys(insights.preferences.knowledge_areas).length > 0 && (
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            Knowledge Areas
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {Object.entries(insights.preferences.knowledge_areas)
                                                .slice(0, 5)
                                                .map(([topic, level]) => (
                                                    <Box key={topic}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="body2">{topic}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {level}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
