import {
    ArrowForward as ArrowForwardIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import {
    Backdrop,
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    IconButton,
    Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import type { MasteryLevel, NodeData } from '../../services/knowledgeGraph';

interface NodeDetailPanelProps {
    node: NodeData | null;
    isOpen: boolean;
    onClose: () => void;
    onMasteryChange: (nodeId: string, mastery: MasteryLevel) => void;
    updating: boolean;
}

const MASTERY_OPTIONS: { value: MasteryLevel; label: string; color: 'error' | 'warning' | 'success'; icon: string }[] = [
    { value: 'unknown', label: 'Unknown', color: 'error', icon: '🔴' },
    { value: 'learning', label: 'Learning', color: 'warning', icon: '🟡' },
    { value: 'known', label: 'Known', color: 'success', icon: '🟢' },
];

export default function NodeDetailPanel({
    node,
    isOpen,
    onClose,
    onMasteryChange,
    updating
}: NodeDetailPanelProps) {
    if (!node) return null;

    return (
        <>
            <Backdrop
                open={isOpen}
                onClick={onClose}
                sx={{ zIndex: (theme) => theme.zIndex.drawer - 1 }}
            />

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={onClose}
                PaperProps={{
                    sx: { width: 384 },
                }}
            >
                <Box sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    {node.label}
                                </Typography>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.15 }}
                            >
                                <Chip label={node.category} color="primary" size="small" />
                            </motion.div>
                        </Box>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Description */}
                    {node.description && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Typography variant="subtitle2" fontWeight="semibold" gutterBottom>
                                Description
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {node.description}
                            </Typography>
                        </motion.div>
                    )}

                    {/* Mastery Level */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Typography variant="subtitle2" fontWeight="semibold" gutterBottom>
                            Mastery Level
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                            {MASTERY_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    onClick={() => onMasteryChange(node.id, option.value)}
                                    disabled={updating}
                                    variant={node.mastery === option.value ? 'contained' : 'outlined'}
                                    color={option.color}
                                    fullWidth
                                    startIcon={<span style={{ fontSize: '1.25rem' }}>{option.icon}</span>}
                                    endIcon={node.mastery === option.value ? <CheckCircleIcon /> : null}
                                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </Box>
                    </motion.div>

                    {/* Prerequisites */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Typography variant="subtitle2" fontWeight="semibold" gutterBottom>
                            Prerequisites
                        </Typography>
                        {node.prerequisites.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                                {node.prerequisites.map((prereq, index) => (
                                    <motion.div
                                        key={prereq}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1.5,
                                                bgcolor: 'background.default',
                                                borderRadius: 1,
                                                border: 1,
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <ArrowForwardIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {prereq.replace('_', ' ')}
                                            </Typography>
                                        </Box>
                                    </motion.div>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic" paragraph>
                                No prerequisites
                            </Typography>
                        )}
                    </motion.div>

                    {/* Node ID */}
                    <Divider sx={{ my: 2 }} />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            Node ID: <Typography component="span" variant="caption" fontFamily="monospace">{node.id}</Typography>
                        </Typography>
                    </motion.div>
                </Box>
            </Drawer>
        </>
    );
}
