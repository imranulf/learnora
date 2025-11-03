/**
 * Learning Path Progress Component
 * 
 * Displays progress for a learning path including:
 * - Overall completion percentage
 * - Per-concept progress bars
 * - Status indicators (not started, in progress, mastered)
 * - Time spent and mastery levels
 */

import {
    CheckCircle as CheckCircleIcon,
    Schedule as InProgressIcon,
    RadioButtonUnchecked as NotStartedIcon,
    Sync as SyncIcon
} from '@mui/icons-material';
import { Box, Card, CardContent, Chip, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import type { ConceptProgress } from '../../services/learningPathProgress';
import { syncProgressWithKG } from '../../services/learningPathProgress';

interface Props {
    concepts: ConceptProgress[];
    overall_progress: number;
    threadId: string;
    onSyncComplete?: () => void;
}

const STATUS_ICONS = {
    mastered: <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />,
    in_progress: <InProgressIcon sx={{ color: 'warning.main', fontSize: 20 }} />,
    not_started: <NotStartedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />,
};

const STATUS_COLORS = {
    mastered: { bgcolor: 'success.light', color: 'success.dark' },
    in_progress: { bgcolor: 'warning.light', color: 'warning.dark' },
    not_started: { bgcolor: 'grey.200', color: 'text.secondary' },
};

const STATUS_LABELS = {
    mastered: 'Mastered',
    in_progress: 'In Progress',
    not_started: 'Not Started',
};

export default function LearningPathProgress({ concepts, overall_progress, threadId, onSyncComplete }: Props) {
    const { session } = useSession();
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        if (!session?.access_token) return;

        setSyncing(true);
        try {
            await syncProgressWithKG(threadId, session.access_token);
            onSyncComplete?.();
        } catch (error) {
            console.error('Failed to sync progress:', error);
        } finally {
            setSyncing(false);
        }
    };

    if (concepts.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="body2" color="text.secondary" align="center">
                        No progress data available yet. Start learning to track your progress!
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                {/* Header with Sync Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        📊 Learning Path Progress
                    </Typography>
                    <Tooltip title="Sync with Knowledge Graph">
                        <IconButton
                            onClick={handleSync}
                            disabled={syncing}
                            size="small"
                            sx={{
                                animation: syncing ? 'spin 1s linear infinite' : 'none',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' }
                                }
                            }}
                        >
                            <SyncIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Overall Progress */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Overall Completion
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                            {overall_progress.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={overall_progress}
                        sx={{
                            height: 10,
                            borderRadius: 1,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: overall_progress === 100 ? 'success.main' : 'primary.main',
                                borderRadius: 1
                            }
                        }}
                    />
                </Box>

                {/* Concept Progress Summary */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="caption" color="text.secondary">
                            {concepts.filter(c => c.status === 'mastered').length} Mastered
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <InProgressIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="caption" color="text.secondary">
                            {concepts.filter(c => c.status === 'in_progress').length} In Progress
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <NotStartedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                            {concepts.filter(c => c.status === 'not_started').length} Not Started
                        </Typography>
                    </Box>
                </Box>

                {/* Per-Concept Progress */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {concepts.map((concept) => (
                        <Box key={concept.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {STATUS_ICONS[concept.status]}
                                    <Typography variant="body2" fontWeight="medium">
                                        {concept.name}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={STATUS_LABELS[concept.status]}
                                    size="small"
                                    sx={{
                                        ...STATUS_COLORS[concept.status],
                                        fontWeight: 'medium',
                                        fontSize: '0.7rem'
                                    }}
                                />
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={concept.mastery_level * 100}
                                sx={{
                                    height: 6,
                                    borderRadius: 1,
                                    bgcolor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: concept.status === 'mastered' ? 'success.main' : 'primary.main',
                                        borderRadius: 1
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Mastery: {(concept.mastery_level * 100).toFixed(0)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {Math.floor(concept.time_spent / 60)}min • {concept.content_count} items
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>

                {/* Completion Message */}
                {overall_progress === 100 && (
                    <Box
                        sx={{
                            mt: 3,
                            p: 2,
                            bgcolor: 'success.light',
                            borderRadius: 1,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="body2" fontWeight="bold" color="success.dark">
                            🎉 Congratulations! You've mastered all concepts in this learning path!
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
