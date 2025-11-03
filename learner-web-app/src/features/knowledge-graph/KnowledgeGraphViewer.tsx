import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { useSession } from '../../hooks/useSession';
import {
    getCategories,
    getKnowledgeGraph,
    updateNodeMastery,
    type EdgeData,
    type KnowledgeGraphStats,
    type MasteryLevel,
    type NodeData,
} from '../../services/knowledgeGraph';
import GraphToolbar from './GraphToolbar';
import NodeDetailPanel from './NodeDetailPanel';

// Color mapping for mastery levels
const MASTERY_COLORS = {
    unknown: {
        background: '#FEE2E2',
        border: '#EF4444',
        highlight: {
            background: '#FCA5A5',
            border: '#DC2626',
        },
    },
    learning: {
        background: '#FEF3C7',
        border: '#F59E0B',
        highlight: {
            background: '#FCD34D',
            border: '#D97706',
        },
    },
    known: {
        background: '#D1FAE5',
        border: '#10B981',
        highlight: {
            background: '#6EE7B7',
            border: '#059669',
        },
    },
};

export default function KnowledgeGraphViewer() {
    const { session } = useSession();
    const networkContainer = useRef<HTMLDivElement>(null);
    const networkInstance = useRef<Network | null>(null);

    const [graphData, setGraphData] = useState<{ nodes: NodeData[]; edges: EdgeData[]; stats: KnowledgeGraphStats } | null>(null);
    const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedMastery, setSelectedMastery] = useState<MasteryLevel | 'all'>('all');
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadGraph = useCallback(async () => {
        if (!session?.access_token) {
            setError('Please sign in to view the knowledge graph');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await getKnowledgeGraph(
                session.access_token,
                selectedCategory !== 'all' ? selectedCategory : undefined,
                selectedMastery !== 'all' ? selectedMastery : undefined
            );

            setGraphData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
        } finally {
            setLoading(false);
        }
    }, [session?.access_token, selectedCategory, selectedMastery]);

    const loadCategories = useCallback(async () => {
        if (!session?.access_token) return;

        try {
            const cats = await getCategories(session.access_token);
            setCategories(cats);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }, [session?.access_token]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadGraph();
    }, [loadGraph]);

    const initializeNetwork = useCallback(() => {
        if (!graphData || !networkContainer.current) return;

        const nodes = new DataSet(
            graphData.nodes.map((node: NodeData) => ({
                id: node.id,
                label: node.label,
                color: MASTERY_COLORS[node.mastery],
                shape: 'box',
                font: {
                    size: 14,
                    color: '#1F2937',
                    face: 'Inter, Arial, sans-serif',
                    bold: {
                        size: 16,
                        color: '#111827',
                    },
                },
                margin: { top: 10, right: 15, bottom: 10, left: 15 },
                borderWidth: 2,
                borderWidthSelected: 3,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.1)',
                    size: 5,
                    x: 0,
                    y: 2,
                },
            }))
        );

        const edges = new DataSet(
            graphData.edges.map((edge: EdgeData) => ({
                id: edge.id,
                from: edge.from_node,
                to: edge.to_node,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8,
                    },
                },
                color: {
                    color: '#9CA3AF',
                    highlight: '#3B82F6',
                },
                width: 2,
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.4,
                },
            }))
        );

        const data = { nodes: nodes as never, edges: edges as never };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'LR',
                    sortMethod: 'directed',
                    nodeSpacing: 200,
                    levelSeparation: 250,
                    treeSpacing: 200,
                },
            },
            physics: {
                enabled: false,
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                zoomView: true,
                hover: true,
                navigationButtons: true,
                keyboard: true,
            },
            nodes: {
                shape: 'box',
            },
        };

        if (networkInstance.current) {
            networkInstance.current.destroy();
        }

        networkInstance.current = new Network(networkContainer.current, data, options);

        networkInstance.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0] as string;
                const node = graphData.nodes.find((n) => n.id === nodeId);
                if (node) {
                    setSelectedNode(node);
                }
            } else {
                setSelectedNode(null);
            }
        });

        networkInstance.current.on('hoverNode', () => {
            if (networkContainer.current) {
                networkContainer.current.style.cursor = 'pointer';
            }
        });

        networkInstance.current.on('blurNode', () => {
            if (networkContainer.current) {
                networkContainer.current.style.cursor = 'default';
            }
        });
    }, [graphData]);

    useEffect(() => {
        if (graphData && networkContainer.current) {
            initializeNetwork();
        }
    }, [graphData, initializeNetwork]);

    const handleMasteryChange = async (nodeId: string, mastery: MasteryLevel) => {
        if (!session?.access_token) return;

        try {
            setUpdating(true);
            await updateNodeMastery(nodeId, mastery, session.access_token);

            if (graphData) {
                const updatedNodes = graphData.nodes.map((node) =>
                    node.id === nodeId ? { ...node, mastery } : node
                );
                setGraphData({
                    ...graphData,
                    nodes: updatedNodes,
                });

                if (selectedNode && selectedNode.id === nodeId) {
                    setSelectedNode({ ...selectedNode, mastery });
                }
            }

            await loadGraph();
        } catch (err) {
            console.error('Failed to update mastery:', err);
            alert(err instanceof Error ? err.message : 'Failed to update mastery');
        } finally {
            setUpdating(false);
        }
    };

    const handleExportPNG = () => {
        if (!networkInstance.current || !networkContainer.current) return;

        try {
            const canvas = networkContainer.current.querySelector('canvas');
            if (canvas) {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `knowledge-graph-${Date.now()}.png`;
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

    const handleExportJSON = () => {
        if (!graphData) return;

        const dataStr = JSON.stringify(graphData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `knowledge-graph-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
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
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Knowledge Graph
                    </Typography>
                </motion.div>
                {graphData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.875rem' }}>
                            <Typography variant="body2">Total: {graphData.stats.total_nodes} concepts</Typography>
                            <Typography variant="body2">🟢 Known: {graphData.stats.known}</Typography>
                            <Typography variant="body2">🟡 Learning: {graphData.stats.learning}</Typography>
                            <Typography variant="body2">🔴 Unknown: {graphData.stats.unknown}</Typography>
                            <Typography variant="body2" sx={{ ml: 'auto' }}>
                                Completion: {graphData.stats.completion_percentage}%
                            </Typography>
                        </Box>
                    </motion.div>
                )}
            </Box>

            {/* Toolbar */}
            <GraphToolbar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedMastery={selectedMastery}
                onCategoryChange={setSelectedCategory}
                onMasteryChange={setSelectedMastery}
                onRefresh={loadGraph}
                onExportPNG={handleExportPNG}
                onExportJSON={handleExportJSON}
                loading={loading}
            />

            {/* Graph Container */}
            <Box sx={{ flex: 1, position: 'relative' }}>
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
                                Loading knowledge graph...
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
                                <Button color="inherit" onClick={loadGraph}>
                                    Retry
                                </Button>
                            }
                        >
                            <Typography variant="h6" gutterBottom>Error</Typography>
                            {error}
                        </Alert>
                    </Box>
                )}

                <Box ref={networkContainer} sx={{ width: '100%', height: '100%', bgcolor: 'background.paper' }} />
            </Box>

            {/* Node Detail Panel */}
            <AnimatePresence>
                {selectedNode && (
                    <NodeDetailPanel
                        node={selectedNode}
                        isOpen={selectedNode !== null}
                        onClose={() => setSelectedNode(null)}
                        onMasteryChange={handleMasteryChange}
                        updating={updating}
                    />
                )}
            </AnimatePresence>
        </Box>
    );
}
