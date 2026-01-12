/**
 * ConceptQuizDialog Component
 *
 * Opens a dialog to take a quiz on a specific concept from the learning path.
 * Integrates with the existing quiz infrastructure:
 * - Generates MCQs and saves to item bank with IRT parameters
 * - Creates a quiz using the quiz API
 * - Uses QuizPlayer for quiz taking
 * - Uses QuizResults for displaying results
 */
import { Close as CloseIcon, Quiz as QuizIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { createQuiz, generateAndSaveMCQs } from '../assessment/api';
import type { QuizResponse, QuizResultResponse } from '../assessment/types';
import QuizPlayer from '../assessment/QuizPlayer';
import QuizResults from '../assessment/QuizResults';

interface ConceptQuizDialogProps {
    open: boolean;
    onClose: () => void;
    conceptName: string;
    conceptId: string;
    learningPathThreadId?: string;
}

type QuizStep = 'setup' | 'generating' | 'playing' | 'results';

export default function ConceptQuizDialog({
    open,
    onClose,
    conceptName,
    conceptId,
}: ConceptQuizDialogProps) {
    const [step, setStep] = useState<QuizStep>('setup');
    const [quiz, setQuiz] = useState<QuizResponse | null>(null);
    const [result, setResult] = useState<QuizResultResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

    const handleStartQuiz = async () => {
        setStep('generating');
        setError(null);

        try {
            // Step 1: Generate MCQs and save to item bank with IRT parameters
            const saveResponse = await generateAndSaveMCQs(
                conceptName,
                conceptId, // Use conceptId as skill
                difficulty,
                5 // 5 questions
            );

            if (!saveResponse.item_codes || saveResponse.item_codes.length === 0) {
                throw new Error('No questions were generated');
            }

            // Step 2: Create a quiz using the saved items
            const quizResponse = await createQuiz({
                title: `${conceptName} Quiz`,
                skill: conceptId,
                difficulty: difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
                total_items: 5,
                is_adaptive: false, // Use batch mode for concept quizzes
            });

            setQuiz(quizResponse);
            setStep('playing');
        } catch (err) {
            console.error('Failed to create quiz:', err);
            setError(err instanceof Error ? err.message : 'Failed to create quiz');
            setStep('setup');
        }
    };

    const handleQuizComplete = (quizResult: QuizResultResponse) => {
        setResult(quizResult);
        setStep('results');
    };

    const handleQuizCancel = () => {
        setStep('setup');
        setQuiz(null);
    };

    const handleClose = () => {
        setStep('setup');
        setQuiz(null);
        setResult(null);
        setError(null);
        onClose();
    };

    const handleRetry = () => {
        setStep('setup');
        setQuiz(null);
        setResult(null);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: step === 'playing' ? 500 : 'auto' },
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <QuizIcon color="primary" />
                        <Typography variant="h6">
                            {step === 'setup' && `Quiz: ${conceptName}`}
                            {step === 'generating' && 'Preparing Quiz...'}
                            {step === 'playing' && quiz?.title}
                            {step === 'results' && 'Quiz Complete'}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Setup Step */}
                {step === 'setup' && (
                    <Stack spacing={3}>
                        <Alert severity="info">
                            Test your knowledge of <strong>{conceptName}</strong> with AI-generated questions.
                            Your results will update your mastery level using IRT.
                        </Alert>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Select Difficulty
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                                    <Chip
                                        key={level}
                                        label={level}
                                        onClick={() => setDifficulty(level)}
                                        color={difficulty === level ? 'primary' : 'default'}
                                        variant={difficulty === level ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                This quiz will generate 5 multiple-choice questions about{' '}
                                <strong>{conceptName}</strong> at the <strong>{difficulty}</strong> level.
                                Your performance will be tracked using Item Response Theory (IRT) to
                                accurately measure your ability.
                            </Typography>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={handleClose} color="inherit">
                                Cancel
                            </Button>
                            <Button variant="contained" onClick={handleStartQuiz}>
                                Start Quiz
                            </Button>
                        </Box>
                    </Stack>
                )}

                {/* Generating Step */}
                {step === 'generating' && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <CircularProgress size={64} sx={{ mb: 3 }} />
                        <Typography variant="h6" gutterBottom>
                            Generating Questions...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Our AI is creating personalized questions for {conceptName}
                        </Typography>
                    </Box>
                )}

                {/* Playing Step - Use QuizPlayer */}
                {step === 'playing' && quiz && (
                    <QuizPlayer
                        quiz={quiz}
                        onComplete={handleQuizComplete}
                        onCancel={handleQuizCancel}
                        mode="batch"
                    />
                )}

                {/* Results Step - Use QuizResults */}
                {step === 'results' && result && (
                    <QuizResults
                        result={result}
                        onRetry={handleRetry}
                        onClose={handleClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
