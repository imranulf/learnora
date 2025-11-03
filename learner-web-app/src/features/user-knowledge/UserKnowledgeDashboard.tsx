import {
    CheckCircle as CheckCircleIcon,
    Edit as EditIcon,
    Error as ErrorIcon,
    Sync as SyncIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '../../hooks/useSession';
import {
    getUserKnowledgeDashboard,
    syncWithAssessment,
    updateUserKnowledgeItem,
    type UpdateUserKnowledgeRequest,
    type UserKnowledgeItem,
    type UserKnowledgeSummary
} from '../../services/userKnowledge';

type FilterOptions = {
    mastery: string;
    sortBy: string;
};

const masteryOptions = [
    { value: '', label: 'All Mastery Levels' },
    { value: 'known', label: 'Known' },
    { value: 'learning', label: 'Learning' },
    { value: 'not_started', label: 'Not Started' },
];

const sortOptions = [
    { value: 'last_updated', label: 'Last Updated' },
    { value: 'score', label: 'Score' },
];

const COLORS = {
    known: '#10B981',
    learning: '#F59E0B',
    not_started: '#6B7280',
};

const masteryColorMap = {
    known: 'success' as const,
    learning: 'warning' as const,
    not_started: 'default' as const,
};

export default function UserKnowledgeDashboard() {
    const { session } = useSession();
    const token = session?.access_token;

    const [items, setItems] = useState<UserKnowledgeItem[]>([]);
    const [summary, setSummary] = useState<UserKnowledgeSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterOptions>({
        mastery: '',
        sortBy: 'last_updated',
    });

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UserKnowledgeItem | null>(null);
    const [editForm, setEditForm] = useState<UpdateUserKnowledgeRequest>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [syncing, setSyncing] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    const fetchDashboard = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            const response = await getUserKnowledgeDashboard(
                token,
                filters.mastery || undefined,
                filters.sortBy
            );
            setItems(response.items);
            setSummary(response.summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
            showToast('Failed to load dashboard', 'error');
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const openEditModal = (item: UserKnowledgeItem) => {
        setSelectedItem(item);
        setEditForm({
            mastery: item.mastery,
            score: item.score,
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setSelectedItem(null);
        setEditForm({});
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !selectedItem) return;

        try {
            await updateUserKnowledgeItem(token, selectedItem.id, editForm);
            showToast('Knowledge updated successfully', 'success');
            closeEditModal();
            fetchDashboard();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Update failed', 'error');
        }
    };

    const handleSync = async () => {
        if (!token) return;

        try {
            setSyncing(true);
            const result = await syncWithAssessment(token);
            showToast(
                `Synced successfully! Updated ${result.updated_concepts} concepts`,
                'success'
            );
            fetchDashboard();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (!token) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                        Authentication Required
                    </Typography>
                    <Typography color="text.secondary">
                        Please sign in to view your knowledge dashboard
                    </Typography>
                </Box>
            </Box>
        );
    }

    const pieChartData = summary
        ? [
            { name: 'Known', value: summary.known, color: COLORS.known },
            { name: 'Learning', value: summary.learning, color: COLORS.learning },
            { name: 'Not Started', value: summary.not_started, color: COLORS.not_started },
        ].filter(item => item.value > 0)
        : [];

    const barChartData = summary
        ? [
            { name: 'Known', count: summary.known },
            { name: 'Learning', count: summary.learning },
            { name: 'Not Started', count: summary.not_started },
        ]
        : [];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                    color: 'white',
                    boxShadow: 3,
                }}
            >
                <Container maxWidth="xl" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h3" fontWeight="bold" gutterBottom>
                                Knowledge Dashboard
                            </Typography>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Track your learning progress and mastery levels
                            </Typography>
                        </Box>
                        <Button
                            onClick={handleSync}
                            disabled={syncing}
                            variant="contained"
                            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'grey.100' },
                                '&:disabled': { opacity: 0.5 },
                            }}
                        >
                            {syncing ? 'Syncing...' : 'Sync with Latest Assessment'}
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Summary Cards */}
                {summary && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                lg: 'repeat(4, 1fr)',
                            },
                            gap: 3,
                            mb: 4,
                        }}
                    >
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        Total Concepts
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mt: 0.5 }}>
                                        {summary.total_concepts}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: 48, height: 48, bgcolor: 'primary.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    📚
                                </Box>
                            </Box>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        Known
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 0.5 }}>
                                        {summary.known}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: 48, height: 48, bgcolor: 'success.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    ✓
                                </Box>
                            </Box>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        Learning
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ mt: 0.5 }}>
                                        {summary.learning}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: 48, height: 48, bgcolor: 'warning.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    📖
                                </Box>
                            </Box>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        Average Score
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: 'primary.main', mt: 0.5 }}>
                                        {Math.round(summary.average_score * 100)}%
                                    </Typography>
                                </Box>
                                <Box sx={{ width: 48, height: 48, bgcolor: 'action.hover', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    📊
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                )}

                {/* Charts */}
                {summary && summary.total_concepts > 0 && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                            gap: 3,
                            mb: 4,
                        }}
                    >
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Mastery Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Concept Breakdown
                            </Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={barChartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Box>
                )}

                {/* Filters */}
                <Paper
                    component={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    elevation={2}
                    sx={{ p: 3, mb: 3 }}
                >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <FormControl sx={{ flex: '1 1 200px' }} size="small">
                            <InputLabel>Filter by Mastery</InputLabel>
                            <Select
                                value={filters.mastery}
                                onChange={(e) => setFilters({ ...filters, mastery: e.target.value })}
                                label="Filter by Mastery"
                            >
                                {masteryOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ flex: '1 1 200px' }} size="small">
                            <InputLabel>Sort by</InputLabel>
                            <Select
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                label="Sort by"
                            >
                                {sortOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>

                {/* Loading */}
                {loading && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
                    >
                        <CircularProgress size={48} />
                    </Box>
                )}

                {/* Error */}
                {error && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Alert severity="error" icon={<ErrorIcon />}>
                            {error}
                        </Alert>
                    </Box>
                )}

                {/* Table */}
                {!loading && !error && items && items.length > 0 && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <TableContainer component={Paper} elevation={2}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Concept</Typography></TableCell>
                                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Mastery</Typography></TableCell>
                                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Score</Typography></TableCell>
                                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Updated</Typography></TableCell>
                                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            component={motion.tr}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {item.concept}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.mastery.replace('_', ' ')}
                                                    color={masteryColorMap[item.mastery as keyof typeof masteryColorMap]}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={item.score * 100}
                                                        sx={{ width: 64, height: 8, borderRadius: 4 }}
                                                    />
                                                    <Typography variant="body2">
                                                        {Math.round(item.score * 100)}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(item.last_updated)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => openEditModal(item)}
                                                >
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}                        {/* Empty State */}
                {!loading && !error && (!items || items.length === 0) && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        sx={{ textAlign: 'center', py: 10 }}
                    >
                        <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
                            📖
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            No knowledge data yet
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Take an assessment or start learning to track your progress
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleSync}
                            sx={{
                                mt: 3,
                                background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #1565c0 0%, #4527a0 100%)',
                                },
                            }}
                        >
                            Sync with Assessment
                        </Button>
                    </Box>
                )}
            </Container>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onClose={closeEditModal} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight="medium">
                        ✏️ Edit Knowledge Item
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleEditSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Concept"
                            value={selectedItem?.concept || ''}
                            disabled
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Mastery Level</InputLabel>
                            <Select
                                value={editForm.mastery}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        mastery: e.target.value as 'known' | 'learning' | 'not_started',
                                    })
                                }
                                label="Mastery Level"
                            >
                                <MenuItem value="known">Known</MenuItem>
                                <MenuItem value="learning">Learning</MenuItem>
                                <MenuItem value="not_started">Not Started</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Score (0-100%)"
                            type="number"
                            inputProps={{ min: 0, max: 100 }}
                            value={Math.round((editForm.score || 0) * 100)}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    score: parseInt(e.target.value) / 100,
                                })
                            }
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeEditModal} variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                            '&:hover': {
                                background: 'linear-gradient(90deg, #1565c0 0%, #4527a0 100%)',
                            },
                        }}
                    >
                        Update
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast */}
            <Snackbar
                open={toast !== null}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setToast(null)}
                    severity={toast?.type}
                    icon={toast?.type === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
                    sx={{ width: '100%' }}
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
