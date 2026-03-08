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
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
    Tooltip,
    useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
import { getPathProgress, initializePathProgress, syncProgressWithKG, type PathProgress } from '../../services/learningPathProgress';
import LearningPathCreationWizard from './LearningPathCreationWizard';
import ConceptQuizDialog from './ConceptQuizDialog';


const MASTERY_COLORS = {
    not_started: {
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        border: '#667eea',
        text: '#374151',
    },
    in_progress: {
        background: 'linear-gradient(135deg, #fff6e5 0%, #ffe4b8 100%)',
        border: '#f59e0b',
        text: '#92400e',
    },
    mastered: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
        border: '#10b981',
        text: '#065f46',
    },
};


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
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const networkContainer = useRef<HTMLDivElement>(null);
    const networkInstance = useRef<Network | null>(null);

    const threadFromUrl = searchParams.get('thread') || '';
    const [learningPaths, setLearningPaths] = useState<LearningPathResponse[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<string>(threadFromUrl);
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

            // Load progress data — auto-initialize if none exists, then sync with KG
            try {
                let progress = await getPathProgress(threadId, session.access_token);

                if (progress.concepts.length === 0 && data.concepts.length > 0) {
                    // Progress not initialized yet — create records using concept labels
                    const conceptNames = data.concepts.map((c) => c.label);
                    await initializePathProgress(threadId, conceptNames, session.access_token);
                }

                // Always sync with KnowledgeState so quiz results reflect on nodes
                try {
                    const syncResult = await syncProgressWithKG(threadId, session.access_token);
                    progress = syncResult.progress;
                } catch {
                    // If sync fails, fall back to regular progress fetch
                    progress = await getPathProgress(threadId, session.access_token);
                }

                setProgressData(progress);
            } catch (progressErr) {
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
                // Use thread from URL if available, otherwise pick first path
                const targetThread = threadFromUrl && paths.some(p => p.conversation_thread_id === threadFromUrl)
                    ? threadFromUrl
                    : paths[0].conversation_thread_id;
                setSelectedPathId(targetThread);
                await loadGraphData(targetThread);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load learning paths');
        } finally {
            setLoading(false);
        }
    }, [session?.access_token, selectedPathId, loadGraphData, threadFromUrl]);

    const handlePathChange = useCallback((threadId: string) => {
        setSelectedPathId(threadId);
        loadGraphData(threadId);
        setSelectedNode(null);
    }, [loadGraphData]);

    useEffect(() => {
        fetchLearningPaths();
    }, [fetchLearningPaths]);

    // Helper: get mastery level for a concept from progress data
    const getMasteryLevel = useCallback((conceptId: string): NodeColor => {
        if (!progressData?.concepts) return 'not_started';
        const conceptName = formatConceptName(conceptId);
        const progress = progressData.concepts.find(
            (c) => c.name === conceptName || c.name.toLowerCase() === conceptId.replace(/_/g, ' ')
        );
        if (!progress) return 'not_started';
        if (progress.status === 'mastered') return 'mastered';
        if (progress.status === 'in_progress') {
            return 'in_progress';
        }
        return 'not_started';
    }, [progressData]);

    const initializeNetwork = useCallback(() => {
        if (!graphData || !networkContainer.current) return;

        // Identify start nodes (no prerequisites) and leaf nodes (not a prerequisite of anything)
        const allPrereqIds = new Set(graphData.concepts.flatMap((c) => c.prerequisites));
        const startNodeIds = new Set(
            graphData.concepts.filter((c) => c.prerequisites.length === 0).map((c) => c.id)
        );
        const leafNodeIds = new Set(
            graphData.concepts.filter((c) => !allPrereqIds.has(c.id)).map((c) => c.id)
        );

        const conceptNodes = graphData.concepts.map((concept: ConceptInfo) => {
            const mastery = getMasteryLevel(concept.id);
            const hasMastery = mastery !== 'not_started';
            const masteryColor = MASTERY_COLORS[mastery];

            const isStart = startNodeIds.has(concept.id);
            const isLeaf = leafNodeIds.has(concept.id);

            // Color priority: mastery > start > leaf > not_started
            let bg: string, border: string, highlight: string;
            if (hasMastery) {
                bg = masteryColor.border;
                border = masteryColor.border;
                highlight = masteryColor.border;
            } else if (isStart) {
                bg = '#0d9488';
                border = '#0f766e';
                highlight = '#14b8a6';
            } else if (isLeaf) {
                bg = '#8b5cf6';
                border = '#7c3aed';
                highlight = '#a78bfa';
            } else {
                // Not started — consistent neutral blue matching legend
                bg = '#667eea';
                border = '#5a67d8';
                highlight = '#7c3aed';
            }

            return {
                id: concept.id,
                label: isStart ? `▶  ${concept.label}` : concept.label,
                color: {
                    background: bg,
                    border: border,
                    highlight: { background: highlight, border: border },
                    hover: { background: highlight, border: border },
                },
                shape: 'box',
                font: {
                    size: 14,
                    color: '#ffffff',
                    face: 'Inter, system-ui, sans-serif',
                    bold: true,
                },
                widthConstraint: { minimum: 140, maximum: 240 },
                margin: { top: 14, right: 18, bottom: 14, left: 18 },
                borderWidth: isStart || isLeaf ? 3 : 2,
                borderWidthSelected: 4,
                shadow: {
                    enabled: true,
                    color: isStart ? 'rgba(13,148,136,0.3)' : isLeaf ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0.15)',
                    size: isStart || isLeaf ? 12 : 8,
                    x: 2,
                    y: 2,
                },
                shapeProperties: {
                    borderRadius: 10,
                },
            };
        });

        // Add a Goal node at the end
        const goalNode = {
            id: '__goal__',
            label: '🏆  Goal Complete',
            color: {
                background: '#d97706',
                border: '#b45309',
                highlight: { background: '#f59e0b', border: '#b45309' },
                hover: { background: '#f59e0b', border: '#b45309' },
            },
            shape: 'box',
            font: {
                size: 15,
                color: '#ffffff',
                face: 'Inter, system-ui, sans-serif',
                bold: true,
            },
            widthConstraint: { minimum: 160, maximum: 240 },
            margin: { top: 16, right: 22, bottom: 16, left: 22 },
            borderWidth: 3,
            borderWidthSelected: 4,
            shadow: {
                enabled: true,
                color: 'rgba(217,119,6,0.4)',
                size: 14,
                x: 2,
                y: 2,
            },
            shapeProperties: {
                borderRadius: 14,
            },
        };

        const nodes = new DataSet([...conceptNodes, goalNode]);

        // Build edges: concept prerequisites + leaf nodes → goal
        const conceptEdges = graphData.concepts.flatMap((concept: ConceptInfo) =>
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
                    type: 'curvedCCW',
                    roundness: 0.15,
                },
                hoverWidth: 3,
                selectionWidth: 3,
            }))
        );

        // Edges from leaf nodes to goal
        const goalEdges = Array.from(leafNodeIds).map((leafId) => ({
            id: `${leafId}-__goal__`,
            from: leafId,
            to: '__goal__',
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.8,
                    type: 'arrow',
                },
            },
            color: {
                color: '#a78bfa',
                highlight: '#7c3aed',
                hover: '#7c3aed',
            },
            width: 2,
            dashes: [8, 4] as number[],
            smooth: {
                enabled: true,
                type: 'curvedCCW',
                roundness: 0.15,
            },
            hoverWidth: 3,
            selectionWidth: 3,
        }));

        const edgesList = [...conceptEdges, ...goalEdges];

        const edges = new DataSet(edgesList as never[]);
        const data = { nodes: nodes as never, edges: edges as never };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: layoutDirection === 'horizontal' ? 'LR' : 'UD',
                    sortMethod: 'directed',
                    shakeTowards: 'roots',
                    nodeSpacing: 180,
                    levelSeparation: 220,
                    treeSpacing: 150,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true,
                },
            },
            physics: {
                enabled: true,
                hierarchicalRepulsion: {
                    centralGravity: 0.2,
                    springLength: 200,
                    springConstant: 0.02,
                    nodeDistance: 180,
                    damping: 0.09,
                    avoidOverlap: 0.8,
                },
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    updateInterval: 25,
                    fit: true,
                },
                solver: 'hierarchicalRepulsion',
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

        // Disable physics after stabilization so nodes stay put
        networkInstance.current.on('stabilizationIterationsDone', () => {
            networkInstance.current?.setOptions({ physics: { enabled: false } });
            networkInstance.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        });

        networkInstance.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0] as string;
                const concept = graphData.concepts.find((c) => c.id === nodeId);
                if (concept) {
                    setSelectedNode({
                        id: concept.id,
                        label: concept.label,
                        prerequisites: concept.prerequisites,
                        mastery: getMasteryLevel(concept.id),
                    });
                }
            } else {
                setSelectedNode(null);
            }
        });
    }, [graphData, layoutDirection, theme.palette.text.primary, theme.palette.text.secondary, getMasteryLevel]);

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
            <Box sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
                {/* Main Graph Area */}
                <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
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

                    {/* Floating Node Detail Panel */}
                    {selectedNode && (
                        <Paper
                            elevation={6}
                            sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                width: 280,
                                backgroundImage: 'none',
                                maxHeight: 'calc(100% - 32px)',
                                overflow: 'auto',
                                borderRadius: 2,
                                zIndex: 10,
                            }}
                        >
                            <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                                        {selectedNode.label}
                                    </Typography>
                                    <IconButton onClick={() => setSelectedNode(null)} size="small" sx={{ ml: 1, mt: -0.5 }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>

                                <Box sx={{ mb: 1.5 }}>
                                    <Chip
                                        label={selectedNode.mastery.replace('_', ' ')}
                                        size="small"
                                        sx={{
                                            bgcolor: MASTERY_COLORS[selectedNode.mastery].border,
                                            color: '#fff',
                                            textTransform: 'capitalize',
                                            fontWeight: 600,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                </Box>

                                {selectedNode.prerequisites.length > 0 && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                                            Prerequisites
                                        </Typography>
                                        {selectedNode.prerequisites.map((prereq) => (
                                            <Chip
                                                key={prereq}
                                                label={formatConceptName(prereq)}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        size="small"
                                        onClick={() => navigate('/discover', { state: { searchQuery: selectedNode.label } })}
                                    >
                                        Start Learning
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        size="small"
                                        onClick={() => navigate('/discover', { state: { searchQuery: selectedNode.label } })}
                                    >
                                        View Resources
                                    </Button>
                                    {(() => {
                                        const unmastered = selectedNode.prerequisites.filter(
                                            (p) => getMasteryLevel(p) !== 'mastered'
                                        );
                                        const prereqsMet = selectedNode.prerequisites.length === 0 || unmastered.length === 0;
                                        return (
                                            <Tooltip
                                                title={
                                                    prereqsMet
                                                        ? ''
                                                        : `Complete prerequisites first: ${unmastered.map(formatConceptName).join(', ')}`
                                                }
                                                arrow
                                            >
                                                <span>
                                                    <Button
                                                        variant="outlined"
                                                        fullWidth
                                                        size="small"
                                                        disabled={!prereqsMet}
                                                        onClick={() => setQuizDialogOpen(true)}
                                                    >
                                                        Take Assessment
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        );
                                    })()}
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {/* Floating Progress Badge */}
                    {graphData && !progressData && (
                        <Chip
                            label="No progress yet — take a quiz to start tracking"
                            size="small"
                            sx={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                zIndex: 5,
                                bgcolor: 'background.paper',
                                border: 1,
                                borderColor: 'divider',
                                fontSize: '0.75rem',
                            }}
                        />
                    )}

                    {/* Floating Progress Summary */}
                    {progressData && graphData && progressData.overall_progress > 0 && (
                        <Chip
                            label={`Progress: ${Math.round(progressData.overall_progress)}%`}
                            size="small"
                            color="primary"
                            sx={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                zIndex: 5,
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>
            </Box>

            {/* Footer - Legend */}
            <Box sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', px: 3, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight="semibold">
                        Legend:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        <Typography variant="caption" color="text.secondary">Start</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        <Typography variant="caption" color="text.secondary">Final</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: '#d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        <Typography variant="caption" color="text.secondary">Goal</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        <Typography variant="caption" color="text.secondary">In Progress</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        <Typography variant="caption" color="text.secondary">Mastered</Typography>
                    </Box>
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
                    onQuizComplete={() => {
                        if (selectedPathId) {
                            loadGraphData(selectedPathId);
                        }
                    }}
                />
            )}
        </Box>
    );
}
