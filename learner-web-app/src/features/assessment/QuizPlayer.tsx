/**
 * QuizPlayer Component
 *
 * Handles both batch and item-by-item adaptive quiz taking.
 * Displays real-time theta updates for adaptive mode.
 */
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  getNextQuizItem,
  getQuizItems,
  submitQuiz,
  submitQuizItemResponse,
} from './api';
import type {
  AdaptiveItemResponse,
  ItemResponse,
  NextItemResponse,
  QuizResponse,
  QuizResultResponse,
} from './types';

interface QuizPlayerProps {
  quiz: QuizResponse;
  onComplete: (result: QuizResultResponse) => void;
  onCancel?: () => void;
  mode?: 'batch' | 'adaptive'; // batch = all items at once, adaptive = item-by-item
}

interface QuizAnswer {
  item_id: number;
  selected_index: number;
}

export default function QuizPlayer({
  quiz,
  onComplete,
  onCancel,
  mode = quiz.is_adaptive ? 'adaptive' : 'batch',
}: QuizPlayerProps) {
  // Batch mode state
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());

  // Adaptive mode state
  const [currentItem, setCurrentItem] = useState<NextItemResponse | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [lastResponse, setLastResponse] = useState<AdaptiveItemResponse | null>(null);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTheta, setCurrentTheta] = useState<number | null>(null);
  const [itemsAnswered, setItemsAnswered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load items for batch mode or first item for adaptive mode
  useEffect(() => {
    const loadQuizData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (mode === 'batch') {
          const quizItems = await getQuizItems(quiz.id);
          setItems(quizItems);
        } else {
          const nextItem = await getNextQuizItem(quiz.id);
          setCurrentItem(nextItem);
          setCurrentTheta(nextItem.current_theta);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    loadQuizData();
  }, [quiz.id, mode]);

  // Handle answer selection in batch mode
  const handleBatchAnswerChange = useCallback(
    (itemId: number, selectedIndex: number) => {
      setAnswers((prev) => {
        const newAnswers = new Map(prev);
        newAnswers.set(itemId, selectedIndex);
        return newAnswers;
      });
    },
    []
  );

  // Submit batch quiz
  const handleBatchSubmit = async () => {
    if (answers.size < items.length) {
      setError('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const responses: QuizAnswer[] = Array.from(answers.entries()).map(
        ([item_id, selected_index]) => ({ item_id, selected_index })
      );

      const result = await submitQuiz(quiz.id, { responses });
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit single item in adaptive mode
  const handleAdaptiveSubmit = async () => {
    if (selectedAnswer === null || !currentItem) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitQuizItemResponse(
        quiz.id,
        parseInt(currentItem.item_code),
        selectedAnswer
      );

      setLastResponse(response);
      setCurrentTheta(response.new_theta);
      setItemsAnswered(response.items_answered);

      if (response.quiz_complete) {
        // Fetch final results
        const result: QuizResultResponse = {
          id: 0,
          quiz_id: quiz.id,
          score: response.items_answered > 0 ? 0 : 0, // Will be calculated by backend
          correct_count: 0,
          total_count: response.items_answered,
          time_taken_minutes: null,
          created_at: new Date().toISOString(),
          theta_estimate: response.new_theta,
          theta_se: response.new_se,
          theta_before: null,
          mastery_updated: true,
        };
        onComplete(result);
      } else {
        // Load next item
        setSelectedAnswer(null);
        setLastResponse(null);
        const nextItem = await getNextQuizItem(quiz.id);
        setCurrentItem(nextItem);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={onCancel} sx={{ mt: 2 }}>
          Cancel
        </Button>
      </Paper>
    );
  }

  // Progress bar
  const progress =
    mode === 'batch'
      ? (answers.size / items.length) * 100
      : (itemsAnswered / quiz.total_items) * 100;

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {quiz.title}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={quiz.skill} size="small" />
          <Chip label={quiz.difficulty} size="small" variant="outlined" />
          {quiz.is_adaptive && (
            <Chip label="Adaptive" size="small" color="primary" />
          )}
        </Stack>

        {/* Progress */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {mode === 'batch'
              ? `${answers.size} of ${items.length} answered`
              : `${itemsAnswered} of ${quiz.total_items} answered`}
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
        </Box>

        {/* Theta display for adaptive mode */}
        {mode === 'adaptive' && currentTheta !== null && (
          <Typography variant="body2" color="primary">
            Current ability (θ): {currentTheta.toFixed(2)}
          </Typography>
        )}
      </Box>

      {/* Batch Mode: Show all items */}
      {mode === 'batch' && (
        <Stack spacing={3}>
          {items.map((item, index) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Question {index + 1}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {item.text}
                </Typography>
                <RadioGroup
                  value={answers.get(item.id) ?? ''}
                  onChange={(e) =>
                    handleBatchAnswerChange(item.id, parseInt(e.target.value))
                  }
                >
                  {item.choices?.map((choice, choiceIndex) => (
                    <FormControlLabel
                      key={choiceIndex}
                      value={choiceIndex}
                      control={<Radio />}
                      label={choice}
                    />
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleBatchSubmit}
              disabled={submitting || answers.size < items.length}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </Box>
        </Stack>
      )}

      {/* Adaptive Mode: Show one item at a time */}
      {mode === 'adaptive' && currentItem && (
        <Box>
          {/* Last response feedback */}
          {lastResponse && (
            <Paper
              sx={{
                p: 2,
                mb: 3,
                bgcolor: lastResponse.is_correct ? 'success.light' : 'error.light',
              }}
            >
              <Typography variant="body2">
                {lastResponse.is_correct ? '✓ Correct!' : '✗ Incorrect'}
              </Typography>
              {lastResponse.explanation && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {lastResponse.explanation}
                </Typography>
              )}
            </Paper>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Question {itemsAnswered + 1} of {quiz.total_items}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {currentItem.text}
              </Typography>
              <RadioGroup
                value={selectedAnswer ?? ''}
                onChange={(e) => setSelectedAnswer(parseInt(e.target.value))}
              >
                {currentItem.choices?.map((choice, index) => (
                  <FormControlLabel
                    key={index}
                    value={index}
                    control={<Radio />}
                    label={choice}
                    disabled={submitting}
                  />
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            {onCancel && (
              <Button onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleAdaptiveSubmit}
              disabled={submitting || selectedAnswer === null}
            >
              {submitting
                ? 'Submitting...'
                : currentItem.is_last
                ? 'Finish Quiz'
                : 'Next Question'}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
