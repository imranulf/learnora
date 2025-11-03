import {
  Assessment as AssessmentIcon,
  CheckCircle,
  TrendingUp
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { createAssessmentSession } from './api';
import type { AssessmentResponse } from './types';

interface AssessmentPanelProps {
  assessments?: AssessmentResponse[];
  onAssessmentComplete?: () => void;
}

export default function AssessmentPanel({
  assessments = [],
  onAssessmentComplete,
}: AssessmentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [skillDomain, setSkillDomain] = useState('');

  const handleStartAssessment = async () => {
    if (!skillDomain.trim()) {
      setError('Please enter a skill domain');
      return;
    }

    setLoading(true);
    setAssessmentResult(null);
    setError('');

    try {
      // Create assessment session with skill domain and skills list
      const result = await createAssessmentSession(
        skillDomain.trim(),
        [skillDomain.trim()] // Use skill domain as the initial skill
      );
      setAssessmentResult(result);
      setSkillDomain(''); // Clear input
      if (onAssessmentComplete) {
        onAssessmentComplete();
      }
    } catch (err) {
      console.error('Assessment error:', err);
      setError(err instanceof Error ? err.message : 'Assessment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const latestAssessment = assessments[0];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssessmentIcon /> Knowledge Assessment
      </Typography>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Skill Domain"
          placeholder="e.g., Python, Mathematics, Data Science"
          value={skillDomain}
          onChange={(e) => setSkillDomain(e.target.value)}
          disabled={loading}
          fullWidth
          size="small"
          helperText="Enter the topic you want to be assessed on"
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? undefined : <TrendingUp />}
          onClick={handleStartAssessment}
          disabled={loading || !skillDomain.trim()}
          fullWidth
        >
          {loading ? 'Creating Assessment...' : 'Start New Assessment'}
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {assessmentResult && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.50' }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="h6" color="text.primary">
                Assessment Complete!
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Ability Score (θ):
              </Typography>
              <Chip
                label={assessmentResult.theta_estimate?.toFixed(2) || 'N/A'}
                color="primary"
                size="small"
              />
            </Box>

            <Alert severity="info" icon={false}>
              📚 New learning path created! Check your Learning Paths panel.
            </Alert>
          </Stack>
        </Paper>
      )}

      {latestAssessment && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Latest Assessment
          </Typography>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Skill Domain:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {latestAssessment.skill_domain}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Status:
                </Typography>
                <Chip
                  label={latestAssessment.status}
                  color={latestAssessment.status === 'completed' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              {latestAssessment.theta_estimate !== null && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Ability (θ):
                  </Typography>
                  <Chip
                    label={latestAssessment.theta_estimate.toFixed(2)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(latestAssessment.created_at).toLocaleDateString()}
              </Typography>
            </Stack>
          </Paper>

          <Alert severity="info" icon={false} sx={{ mt: 2 }}>
            💡 <strong>Tip:</strong> Use the Assessment Wizard for the full CAT adaptive testing experience!
          </Alert>
        </>
      )}

      {!latestAssessment && !assessmentResult && (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography variant="body1" color="text.secondary">
            📝 Take your first assessment to get started!
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
