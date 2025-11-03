import {
    AutoGraph as AutoGraphIcon,
    Close as CloseIcon,
    School as SchoolIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../hooks/useSession';
import { startLearningPath } from '../../services/learningPath';

interface LearningPathCreationWizardProps {
    open: boolean;
    onClose: () => void;
    onComplete?: (threadId: string) => void;
}

export default function LearningPathCreationWizard({
    open,
    onClose,
    onComplete,
}: LearningPathCreationWizardProps) {
    const { session } = useSession();
    const navigate = useNavigate();

    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.access_token) {
            setError('Please sign in to create a learning path');
            return;
        }

        if (!topic.trim()) {
            setError('Please enter a learning topic');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await startLearningPath(topic.trim(), session.access_token);

            setSuccess(true);

            // Wait a moment to show success message
            setTimeout(() => {
                if (onComplete) {
                    onComplete(result.thread_id);
                }
                handleClose();
                // Navigate to the learning path page to see the created path
                navigate('/learning-path');
            }, 1500);
        } catch (err) {
            console.error('Failed to create learning path:', err);
            setError(err instanceof Error ? err.message : 'Failed to create learning path');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setTopic('');
            setError(null);
            setSuccess(false);
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                component: motion.div,
                initial: { opacity: 0, y: -20 },
                animate: { opacity: 1, y: 0 },
                sx: { borderRadius: 2 },
            }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Create Learning Path
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} disabled={loading} edge="end">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {success ? (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        sx={{ textAlign: 'center', py: 4 }}
                    >
                        <AutoGraphIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="bold" gutterBottom color="success.main">
                            Learning Path Created!
                        </Typography>
                        <Typography color="text.secondary">
                            Your AI-powered learning path is being generated...
                        </Typography>
                    </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Enter a topic you want to learn, and our AI will create a personalized learning path
                            with structured concepts and prerequisites.
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            fullWidth
                            label="Learning Topic"
                            placeholder="e.g., Machine Learning, React.js, Data Structures"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={loading}
                            autoFocus
                            required
                            sx={{ mb: 3 }}
                            helperText="Be specific for better results (e.g., 'Python for Data Science' instead of just 'Python')"
                        />

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button onClick={handleClose} disabled={loading} variant="outlined">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading || !topic.trim()}
                                startIcon={loading ? <CircularProgress size={20} /> : <AutoGraphIcon />}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                                    },
                                }}
                            >
                                {loading ? 'Creating...' : 'Create Learning Path'}
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                mt: 3,
                                p: 2,
                                bgcolor: 'info.light',
                                borderRadius: 1,
                                border: 1,
                                borderColor: 'info.main',
                            }}
                        >
                            <Typography variant="caption" fontWeight="medium" color="info.dark">
                                💡 Tips for best results:
                            </Typography>
                            <Typography variant="caption" component="div" color="info.dark" sx={{ mt: 0.5 }}>
                                • Be specific about the domain (e.g., "Deep Learning for Computer Vision")
                                <br />
                                • Include your current level if relevant (e.g., "Advanced JavaScript")
                                <br />
                                • Focus on one topic at a time for better structure
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
