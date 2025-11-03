import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Alert,
  Stack,
  Chip,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import {
  createAssessmentSession,
  getNextAdaptiveItem,
  submitItemResponse,
  getAssessmentDashboard,
} from './api';
import type {
  AssessmentResponse,
  NextItemResponse,
  AssessmentDashboard,
} from './types';

interface AssessmentWizardProps {
  open: boolean;
  onComplete?: (result: AssessmentResponse) => void;
  onClose: () => void;
}

type WizardStep = 'setup' | 'testing' | 'complete';

export default function AssessmentWizard({ open, onComplete, onClose }: AssessmentWizardProps) {
  const [step, setStep] = useState<WizardStep>('setup');
  const [skillDomain, setSkillDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Assessment state
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);
  const [currentItem, setCurrentItem] = useState<NextItemResponse | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number>(-1);
  const [itemsAnswered, setItemsAnswered] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [dashboard, setDashboard] = useState<AssessmentDashboard | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('setup');
      setSkillDomain('');
      setError('');
      setAssessment(null);
      setCurrentItem(null);
      setSelectedAnswer(-1);
      setItemsAnswered(0);
      setDashboard(null);
    }
  }, [open]);

  const startAssessment = async () => {
    if (!skillDomain.trim()) {
      setError('Please enter a skill domain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session = await createAssessmentSession(
        skillDomain.trim(),
        [skillDomain.trim()]
      );
      setAssessment(session);

      const nextItem = await getNextAdaptiveItem(session.id);
      setCurrentItem(nextItem);
      setStartTime(Date.now());
      setStep('testing');
      setItemsAnswered(0);
    } catch (err) {
      console.error('Failed to start assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!assessment || !currentItem || selectedAnswer === -1) {
      setError('Please select an answer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      
      await submitItemResponse(
        assessment.id,
        currentItem.item_code,
        selectedAnswer,
        timeTaken
      );

      setItemsAnswered(prev => prev + 1);

      if (currentItem.is_last) {
        const dashboardData = await getAssessmentDashboard(assessment.id);
        setDashboard(dashboardData);
        setStep('complete');
        
        if (onComplete && assessment) {
          onComplete(assessment);
        }
      } else {
        const nextItem = await getNextAdaptiveItem(assessment.id);
        setCurrentItem(nextItem);
        setSelectedAnswer(-1);
        setStartTime(Date.now());
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'testing' && !window.confirm('Are you sure you want to exit?')) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {step === 'setup' && 'Start Assessment'}
            {step === 'testing' && `Assessment - ${skillDomain}`}
            {step === 'complete' && 'Assessment Complete'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
            {error}
          </Alert>
        )}

        {step === 'setup' && (
          <Stack spacing={3}>
            <Alert severity="info">
              This adaptive assessment uses CAT to efficiently evaluate your knowledge.
            </Alert>

            <TextField
              label="Skill Domain"
              placeholder="e.g., Python, Mathematics"
              value={skillDomain}
              onChange={(e) => setSkillDomain(e.target.value)}
              disabled={loading}
              fullWidth
              autoFocus
            />
          </Stack>
        )}

        {step === 'testing' && currentItem && (
          <Stack spacing={3}>
            <Box>
              <Chip label={`Question ${itemsAnswered + 1}`} color="primary" size="small" />
            </Box>

            <LinearProgress variant="determinate" value={(itemsAnswered / 10) * 100} />

            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>{currentItem.text}</Typography>

              {currentItem.choices && currentItem.choices.length > 0 ? (
                <RadioGroup
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(Number(e.target.value))}
                >
                  {currentItem.choices.map((choice, index) => (
                    <FormControlLabel
                      key={index}
                      value={index}
                      control={<Radio />}
                      label={choice}
                    />
                  ))}
                </RadioGroup>
              ) : (
                <Alert severity="warning">Open-ended questions not yet supported</Alert>
              )}
            </Paper>
          </Stack>
        )}

        {step === 'complete' && dashboard && (
          <Stack spacing={3}>
            <Alert severity="success" icon={<CheckCircle />}>
              Assessment Complete! You answered {itemsAnswered} questions.
            </Alert>

            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Final Ability (?):</Typography>
                  <Chip label={dashboard.ability_estimate.toFixed(2)} color="primary" />
                </Box>
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {step === 'complete' ? 'Close' : 'Cancel'}
        </Button>
        
        {step === 'setup' && (
          <Button variant="contained" onClick={startAssessment} disabled={loading || !skillDomain.trim()}>
            {loading ? 'Starting...' : 'Start Assessment'}
          </Button>
        )}
        
        {step === 'testing' && (
          <Button variant="contained" onClick={handleSubmitAnswer} disabled={loading || selectedAnswer === -1}>
            {loading ? 'Submitting...' : 'Submit Answer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
