import {
    Add as AddIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Image as ImageIcon,
    Refresh as RefreshIcon,
    SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Typography,
    useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { useSession } from '../../hooks/useSession';
import {
    getAllLearningPaths,
    getLearningPathKG,
    type ConceptInfo,
    type LearningPathKGResponse,
    type LearningPathResponse,
} from '../../services/learningPath';
import { getPathProgress, type PathProgress } from '../../services/learningPathProgress';
import LearningPathCreationWizard from './LearningPathCreationWizard';
import LearningPathProgress from './LearningPathProgress';
import ConceptQuizDialog from './ConceptQuizDialog';


const MASTERY_COLORS = {
    not_started: {
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        border: '#667eea',
        text: '#374151',
    },
    beginner: {
        background: 'linear-gradient(135deg, #fff6e5 0%, #ffe4b8 100%)',
        border: '#f59e0b',
        text: '#92400e',
    },
    intermediate: {
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        border: '#0ea5e9',
        text: '#075985',
    },
    advanced: {
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        border: '#22c55e',
        text: '#166534',
    },
    mastered: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
        border: '#10b981',
        text: '#065f46',
    },
};

const NODE_COLORS = [
    { bg: '#667eea', border: '#5a67d8', highlight: '#7c3aed' },
    { bg: '#f093fb', border: '#ec4899', highlight: '#f472b6' },
    { bg: '#4facfe', border: '#2563eb', highlight: '#3b82f6' },
    { bg: '#43e97b', border: '#22c55e', highlight: '#4ade80' },
    { bg: '#fa709a', border: '#e11d48', highlight: '#fb7185' },
    { bg: '#fee140', border: '#eab308', highlight: '#facc15' },
];

type LayoutDirection = 'horizontal' | 'vertical';
type NodeColor = keyof typeof MASTERY_COLORS;

interface DetailPanelData {
    id: string;
    label: string;
    prerequisites: string[];
    mastery: NodeColor;
}

// Helper to format snake_case to Title Case
const formatConceptName = (name: string): string => {
    return name
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export default function LearningPathViewer() {
    const { session } = useSession();
    const navigate = useNavigate();
    const theme = useTheme();
    const networkContainer = useRef<HTMLDivElement>(null);
    const networkInstance = useRef<Network | null>(null);

    const [learningPaths, setLearningPaths] = useState<LearningPathResponse[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<string>('');
    const [graphData, setGraphData] = useState<LearningPathKGResponse | null>(null);
    const [progressData, setProgressData] = useState<PathProgress | null>(null);
    const [selectedNode, setSelectedNode] = useState<DetailPanelData | null>(null);
    const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('horizontal');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [quizDialogOpen, setQuizDialogOpen] = useState(false);

    const loadGraphData = useCallback(async (threadId: string) => {
        if (!session?.access_token) {
            setError('Please sign in to view learning paths');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await getLearningPathKG(threadId, session.access_token);
            setGraphData(data);

            // Load progress data
            try {
                const progress = await getPathProgress(threadId, session.access_token);
                setProgressData(progress);
            } catch (progressErr) {
                // Progress may not exist yet for new paths - that's okay
                console.log('No progress data yet:', progressErr);
                setProgressData(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        } finally {
            setLoading(false);
        }
    }, [session?.access_token]);

    const fetchLearningPaths = useCallback(async () => {
        if (!session?.access_token) {
            setError('Please sign in to view learning paths');
            return;
        }

        try {
            setLoading(true);
            const paths = await getAllLearningPaths(session.access_token);
            setLearningPaths(paths);
            if (paths.length > 0 && !selectedPathId) {
                setSelectedPathId(paths[0].conversation_thread_id);
                await loadGraphData(paths[0].conversation_thread_id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load learning paths');
        } finally {
            setLoading(false);
        }
    }, [session?.access_token, selectedPathId, loadGraphData]);

    const handlePathChange = useCallback((threadId: string) => {
        setSelectedPathId(threadId);
        loadGraphData(threadId);
        setSelectedNode(null);
    }, [loadGraphData]);

    useEffect(() => {
        fetchLearningPaths();
    }, [fetchLearningPaths]);

    const initializeNetwork = useCallback(() => {
        if (!graphData || !networkContainer.current) return;

        const nodes = new DataSet(
            graphData.concepts.map((concept: ConceptInfo, index: number) => {
                const colorScheme = NODE_COLORS[index % NODE_COLORS.length];
                return {
                    id: concept.id,
                    label: concept.label,
                    color: {
                        background: colorScheme.bg,
                        border: colorScheme.border,
                        highlight: {
                            background: colorScheme.highlight,
                            border: colorScheme.border,
                        },
                        hover: {
                            background: colorScheme.highlight,
                            border: colorScheme.border,
                        },
                    },
                    shape: 'box',
                    font: {
                        size: 14,
                        color: '#ffffff',
                        face: 'Inter, system-ui, sans-serif',
                        bold: true,
                    },
                    margin: { top: 15, right: 20, bottom: 15, left: 20 },
                    borderWidth: 3,
                    borderWidthSelected: 4,
                    shadow: {
                        enabled: true,
                        color: 'rgba(0,0,0,0.2)',
                        size: 10,
                        x: 3,
                        y: 3,
                    },
                    shapeProperties: {
                        borderRadius: 12,
                    },
                };
            })
        );

        const edgesList = graphData.concepts.flatMap((concept: ConceptInfo) =>
            concept.prerequisites.map((prereq) => ({
                id: `${prereq}-${concept.id}`,
                from: prereq,
                to: concept.id,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8,
                        type: 'arrow',
                    },
                },
                color: {
                    color: '#94a3b8',
                    highlight: '#667eea',
                    hover: '#667eea',
                },
                width: 2,
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: layoutDirection === 'horizontal' ? 'horizontal' : 'vertical',
                    roundness: 0.5,
                },
                hoverWidth: 3,
                selectionWidth: 3,
            }))
        );

        const edges = new DataSet(edgesList as never[]);
        const data = { nodes: nodes as never, edges: edges as never };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: layoutDirection === 'horizontal' ? 'LR' : 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: 220,
                    levelSeparation: 280,
                    treeSpacing: 200,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true,
                },
            },
            physics: {
                enabled: false,
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                zoomView: true,
                navigationButtons: true,
                keyboard: true,
                hover: true,
                tooltipDelay: 200,
            },
            nodes: {
                shape: 'box',
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8,
                    },
                },
            },
        };

        if (networkInstance.current) {
            networkInstance.current.destroy();
        }

        networkInstance.current = new Network(networkContainer.current, data, options);

        networkInstance.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0] as string;
                const concept = graphData.concepts.find((c) => c.id === nodeId);
                if (concept) {
                    setSelectedNode({
                        id: concept.id,
                        label: concept.label,
                        prerequisites: concept.prerequisites,
                        mastery: 'not_started',
                    });
                }
            } else {
                setSelectedNode(null);
            }
        });
    }, [graphData, layoutDirection, theme.palette.text.primary, theme.palette.text.secondary]);

    useEffect(() => {
        if (graphData && networkContainer.current) {
            initializeNetwork();
        }

        // Cleanup on unmount - destroy network instance to prevent memory leak
        return () => {
            if (networkInstance.current) {
                networkInstance.current.destroy();
                networkInstance.current = null;
            }
        };
    }, [graphData, initializeNetwork]);

    const toggleLayout = () => {
        setLayoutDirection((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
    };

    const refreshGraph = () => {
        if (selectedPathId) {
            loadGraphData(selectedPathId);
        }
    };

    const exportAsJSON = () => {
        if (!graphData) return;
        const dataStr = JSON.stringify(graphData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learning-path-${graphData.thread_id}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportAsPNG = () => {
        if (!networkInstance.current || !networkContainer.current) return;

        try {
            const canvas = networkContainer.current.querySelector('canvas');
            if (canvas) {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `learning-path-${graphData?.thread_id || Date.now()}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                });
            }
        } catch (err) {
            console.error('Failed to export PNG:', err);
            alert('Failed to export PNG');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                    color: 'white',
                    px: 3,
                    py: 2,
                }}
            >
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Learning Paths
                    </Typography>
                </motion.div>
                {graphData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {graphData.topic} · {graphData.concept_count} concepts
                        </Typography>
                    </motion.div>
                )}
            </Box>

            {/* Toolbar */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 3, py: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                        Select Path:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
                        <InputLabel>Learning Path</InputLabel>
                        <Select
                            value={selectedPathId}
                            onChange={(e) => handlePathChange(e.target.value)}
                            label="Learning Path"
                            disabled={loading}
                        >
                            <MenuItem value="">Choose a learning path</MenuItem>
                            {learningPaths.map((path) => (
                                <MenuItem key={path.conversation_thread_id} value={path.conversation_thread_id}>
                                    {path.topic}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        onClick={() => setWizardOpen(true)}
                        variant="contained"
                        startIcon={<AddIcon />}
                        size="small"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                            },
                        }}
                    >
                        Create New
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        onClick={refreshGraph}
                        disabled={loading || !selectedPathId}
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        size="small"
                    >
                        Refresh
                    </Button>

                    <Button
                        onClick={toggleLayout}
                        disabled={loading || !graphData}
                        variant="outlined"
                        startIcon={<SwapHorizIcon />}
                        size="small"
                    >
                        {layoutDirection === 'horizontal' ? 'Vertical' : 'Horizontal'} Layout
                    </Button>

                    <Button
                        onClick={exportAsPNG}
                        disabled={loading || !graphData}
                        variant="outlined"
                        startIcon={<ImageIcon />}
                        size="small"
                    >
                        Export PNG
                    </Button>

                    <Button
                        onClick={exportAsJSON}
                        disabled={loading || !graphData}
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        size="small"
                    >
                        Export JSON
                    </Button>
                </Box>
            </Box>

            {/* Graph Container */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 2, p: 2 }}>
                {/* Main Graph Area */}
                <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    {loading && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'background.paper',
                                opacity: 0.9,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                        >
                            <Box sx={{ textAlign: 'center' }}>
                                <CircularProgress size={64} sx={{ mb: 2 }} />
                                <Typography color="text.secondary" fontWeight="medium">
                                    Loading learning path...
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {error && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                        >
                            <Alert
                                severity="error"
                                sx={{ maxWidth: 'md', boxShadow: 3 }}
                                action={
                                    <Button color="inherit" onClick={fetchLearningPaths}>
                                        Retry
                                    </Button>
                                }
                            >
                                <Typography variant="h6" gutterBottom>
                                    Error
                                </Typography>
                                {error}
                            </Alert>
                        </Box>
                    )}

                    {!loading && !error && learningPaths.length === 0 && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Box sx={{ textAlign: 'center', maxWidth: 500, px: 3 }}>
                                <Typography variant="h1" sx={{ fontSize: '6rem', mb: 2 }}>
                                    🎯
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" gutterBottom>
                                    No Learning Paths Yet
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                                    Start your personalized learning journey by creating your first AI-powered learning
                                    path. Our system will structure the concepts and prerequisites for you.
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<AddIcon />}
                                    onClick={() => setWizardOpen(true)}
                                    sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        px: 4,
                                        py: 1.5,
                                        fontSize: '1.1rem',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                                        },
                                    }}
                                >
                                    Create Your First Learning Path
                                </Button>
                            </Box>
                        </Box>
                    )}

                    <Box ref={networkContainer} sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', borderRadius: 2 }} />
                </Box>

                {/* Progress Panel */}
                {progressData && graphData && (
                    <Box sx={{ width: 380, flexShrink: 0, overflow: 'auto' }}>
                        <LearningPathProgress
                            concepts={progressData.concepts}
                            overall_progress={progressData.overall_progress}
                            threadId={selectedPathId}
                            onSyncComplete={() => {
                                // Reload progress after sync
                                if (selectedPathId && session?.access_token) {
                                    getPathProgress(selectedPathId, session.access_token)
                                        .then(setProgressData)
                                        .catch(console.error);
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Side Panel */}
                {selectedNode && (
                    <Drawer
                        anchor="right"
                        open={Boolean(selectedNode)}
                        onClose={() => setSelectedNode(null)}
                        PaperProps={{ sx: { width: 320 } }}
                        variant="persistent"
                    >
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                                <Typography variant="h6" fontWeight="bold">
                                    {selectedNode.label}
                                </Typography>
                                <IconButton onClick={() => setSelectedNode(null)} size="small">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight="semibold" gutterBottom>
                                    Mastery Level
                                </Typography>
                                <Chip
                                    label={selectedNode.mastery.replace('_', ' ')}
                                    sx={{
                                        bgcolor: MASTERY_COLORS[selectedNode.mastery].border,
                                        color: '#fff',
                                        textTransform: 'capitalize',
                                        fontWeight: 600,
                                    }}
                                />
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight="semibold" gutterBottom>
                                    Prerequisites
                                </Typography>
                                {selectedNode.prerequisites.length > 0 ? (
                                    <List dense>
                                        {selectedNode.prerequisites.map((prereq) => (
                                            <ListItem
                                                key={prereq}
                                                sx={{
                                                    bgcolor: 'background.default',
                                                    borderRadius: 1,
                                                    mb: 0.5,
                                                    border: 1,
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <ListItemText primary={formatConceptName(prereq)} primaryTypographyProps={{ variant: 'body2' }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                        No prerequisites
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/content-discovery', { state: { searchQuery: selectedNode.label } })}
                                >
                                    Start Learning
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/content-discovery', { state: { searchQuery: selectedNode.label } })}
                                >
                                    View Resources
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => setQuizDialogOpen(true)}
                                >
                                    Take Assessment
                                </Button>
                            </Box>
                        </Box>
                    </Drawer>
                )}
            </Box>

            {/* Footer - Mastery Legend */}
            <Box sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', px: 3, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight="semibold">
                        Mastery Levels:
                    </Typography>
                    {Object.entries(MASTERY_COLORS).map(([level, colors]) => (
                        <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: colors.border, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                {level.replace('_', ' ')}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Learning Path Creation Wizard */}
            <LearningPathCreationWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onComplete={() => {
                    fetchLearningPaths();
                }}
            />

            {/* Concept Quiz Dialog */}
            {selectedNode && (
                <ConceptQuizDialog
                    open={quizDialogOpen}
                    onClose={() => setQuizDialogOpen(false)}
                    conceptName={selectedNode.label}
                    conceptId={selectedNode.id}
                    learningPathThreadId={selectedPathId}
                />
            )}
        </Box>
    );
}
