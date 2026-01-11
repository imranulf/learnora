/**
 * QuizResults Component
 *
 * Displays quiz results with IRT ability estimates and mastery updates.
 */
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import type { QuizResultResponse } from './types';

interface QuizResultsProps {
  result: QuizResultResponse;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function QuizResults({
  result,
  onRetry,
  onClose,
}: QuizResultsProps) {
  const scorePercent = result.score * 100;
  const thetaDelta =
    result.theta_estimate !== null && result.theta_before !== null
      ? result.theta_estimate - result.theta_before
      : null;

  // Determine performance level
  const getPerformanceLevel = (score: number) => {
    if (score >= 0.9) return { label: 'Excellent', color: 'success' as const };
    if (score >= 0.7) return { label: 'Good', color: 'primary' as const };
    if (score >= 0.5) return { label: 'Fair', color: 'warning' as const };
    return { label: 'Needs Improvement', color: 'error' as const };
  };

  const performance = getPerformanceLevel(result.score);

  // Format theta for display
  const formatTheta = (theta: number | null) => {
    if (theta === null) return 'N/A';
    return theta.toFixed(2);
  };

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Quiz Complete!
        </Typography>
        <Chip
          label={performance.label}
          color={performance.color}
          size="medium"
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Score Summary */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Score Summary
          </Typography>
          <Box sx={{ textAlign: 'center', my: 3 }}>
            <Typography variant="h2" color="primary">
              {scorePercent.toFixed(0)}%
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {result.correct_count} of {result.total_count} correct
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={scorePercent}
            color={performance.color}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </CardContent>
      </Card>

      {/* IRT Ability Estimates */}
      {(result.theta_estimate !== null || result.theta_before !== null) && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <PsychologyIcon color="primary" />
              <Typography variant="h6">Ability Estimate (IRT)</Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              divider={<Divider orientation="vertical" flexItem />}
            >
              {/* Before */}
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Before Quiz
                </Typography>
                <Typography variant="h5">
                  θ = {formatTheta(result.theta_before)}
                </Typography>
              </Box>

              {/* After */}
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  After Quiz
                </Typography>
                <Typography variant="h5">
                  θ = {formatTheta(result.theta_estimate)}
                </Typography>
                {result.theta_se !== null && (
                  <Typography variant="caption" color="text.secondary">
                    SE: ±{result.theta_se.toFixed(2)}
                  </Typography>
                )}
              </Box>

              {/* Change */}
              {thetaDelta !== null && (
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Change
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.5}
                  >
                    {thetaDelta >= 0 ? (
                      <TrendingUpIcon color="success" />
                    ) : (
                      <TrendingDownIcon color="error" />
                    )}
                    <Typography
                      variant="h5"
                      color={thetaDelta >= 0 ? 'success.main' : 'error.main'}
                    >
                      {thetaDelta >= 0 ? '+' : ''}
                      {thetaDelta.toFixed(2)}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Stack>

            {/* Explanation */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>What is θ (theta)?</strong>
                <br />
                Theta is your ability estimate on a standardized scale. A θ of 0
                represents average ability, positive values indicate above-average,
                and negative values indicate below-average. This is calculated using
                Item Response Theory (IRT 2PL model).
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Mastery Update */}
      {result.mastery_updated && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Knowledge State Updated
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your mastery probability for this skill has been updated based on your
              performance using Bayesian Knowledge Tracing (BKT).
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
        {onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Try Again
          </Button>
        )}
        {onClose && (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
