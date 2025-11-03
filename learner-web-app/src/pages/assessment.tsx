import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { AssessmentPanel, AssessmentWizard } from '../features/assessment';
import { listAssessmentSessions } from '../features/assessment/api';
import type { AssessmentResponse } from '../features/assessment/types';

export default function AssessmentPage() {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadAssessments = async () => {
    try {
      const data = await listAssessmentSessions();
      setAssessments(data);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleAssessmentComplete = () => {
    loadAssessments();
  };

  const handleWizardComplete = () => {
    setWizardOpen(false);
    loadAssessments();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          My Assessments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setWizardOpen(true)}
        >
          Create Learning Path
        </Button>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: '1 1 65%' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <AssessmentPanel
              assessments={assessments}
              onAssessmentComplete={handleAssessmentComplete}
            />
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 35%' }}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assessments: {assessments.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed: {assessments.filter((a: AssessmentResponse) => a.status === 'completed').length}
            </Typography>
          </Paper>
        </Box>
      </Stack>

      <AssessmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
    </Container>
  );
}
