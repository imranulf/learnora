import {
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
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
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import {
    createConcept,
    deleteConcept,
    getConcepts,
    updateConcept,
    type Concept,
    type ConceptCreate,
    type ConceptUpdate,
} from '../../services/concepts';

type FilterOptions = {
    search: string;
    category: string;
    difficulty: string;
};

type ModalMode = 'create' | 'edit' | null;

const categories = ['Programming', 'Math', 'Science', 'General'];
const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const difficultyColors = {
    Beginner: 'success',
    Intermediate: 'warning',
    Advanced: 'error',
    Expert: 'error',
} as const;

export default function ConceptManagement() {
    const { session } = useSession();
    const token = session?.access_token;
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        category: '',
        difficulty: '',
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(12);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conceptToDelete, setConceptToDelete] = useState<Concept | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form state
    const [formData, setFormData] = useState<ConceptCreate>({
        concept_id: '',
        label: '',
        description: '',
        category: '',
        difficulty: '',
        tags: [],
        prerequisites: [],
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    const fetchConcepts = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            const response = await getConcepts(
                token,
                page,
                pageSize,
                filters.search || undefined,
                filters.category || undefined,
                filters.difficulty || undefined
            );
            setConcepts(response.items);
            setTotalPages(response.total_pages);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load concepts');
            showToast('Failed to load concepts', 'error');
        } finally {
            setLoading(false);
        }
    }, [token, page, pageSize, filters]);

    useEffect(() => {
        fetchConcepts();
    }, [fetchConcepts]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPage(1);
        fetchConcepts();
    };

    const openCreateModal = () => {
        setFormData({
            concept_id: '',
            label: '',
            description: '',
            category: '',
            difficulty: '',
            tags: [],
            prerequisites: [],
        });
        setModalMode('create');
    };

    const openEditModal = (concept: Concept) => {
        setSelectedConcept(concept);
        setFormData({
            concept_id: concept.id,
            label: concept.label,
            description: concept.description || '',
            category: concept.category || '',
            difficulty: concept.difficulty || '',
            tags: concept.tags || [],
            prerequisites: concept.prerequisites || [],
        });
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedConcept(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        try {
            if (modalMode === 'create') {
                await createConcept(token, formData);
                showToast('Concept created successfully', 'success');
            } else if (modalMode === 'edit' && selectedConcept) {
                const updateData: ConceptUpdate = {
                    label: formData.label,
                    description: formData.description,
                    category: formData.category,
                    difficulty: formData.difficulty,
                    tags: formData.tags,
                    prerequisites: formData.prerequisites,
                };
                await updateConcept(token, selectedConcept.id, updateData);
                showToast('Concept updated successfully', 'success');
            }
            closeModal();
            fetchConcepts();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
        }
    };

    const openDeleteDialog = (concept: Concept) => {
        setConceptToDelete(concept);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!conceptToDelete || !token) return;
        try {
            await deleteConcept(token, conceptToDelete.id);
            showToast('Concept deleted successfully', 'success');
            setDeleteDialogOpen(false);
            setConceptToDelete(null);
            fetchConcepts();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete concept', 'error');
        }
    };

    if (!token) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                        Authentication Required
                    </Typography>
                    <Typography color="text.secondary">
                        Please sign in to manage concepts
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header with gradient */}
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
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        Concept Management
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Create, edit, and manage your learning concepts
                    </Typography>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Search and Filters */}
                <Paper
                    component={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    elevation={2}
                    sx={{ p: 3, mb: 3 }}
                >
                    <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <TextField
                            placeholder="Search concepts..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            sx={{ flex: '1 1 250px' }}
                            size="small"
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={filters.category}
                                onChange={(e) => {
                                    setFilters({ ...filters, category: e.target.value });
                                    setPage(1);
                                }}
                                label="Category"
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat} value={cat}>
                                        {cat}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Difficulty</InputLabel>
                            <Select
                                value={filters.difficulty}
                                onChange={(e) => {
                                    setFilters({ ...filters, difficulty: e.target.value });
                                    setPage(1);
                                }}
                                label="Difficulty"
                            >
                                <MenuItem value="">All Difficulties</MenuItem>
                                {difficulties.map((diff) => (
                                    <MenuItem key={diff} value={diff}>
                                        {diff}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateModal}
                            sx={{
                                background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #1565c0 0%, #4527a0 100%)',
                                },
                            }}
                        >
                            Add New Concept
                        </Button>
                    </Box>
                </Paper>

                {/* Loading State */}
                {loading && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}
                    >
                        <CircularProgress size={48} />
                    </Box>
                )}

                {/* Error State */}
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

                {/* Concepts Grid */}
                {!loading && !error && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                            },
                            gap: 3,
                        }}
                    >
                        <AnimatePresence mode="popLayout">
                            {concepts.map((concept) => (
                                <Paper
                                    key={concept.id}
                                    component={motion.div}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    elevation={2}
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        '&:hover': {
                                            boxShadow: 6,
                                        },
                                        transition: 'box-shadow 0.3s',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Typography variant="h6" fontWeight="bold" color="text.primary">
                                            {concept.label}
                                        </Typography>
                                        {concept.difficulty && (
                                            <Chip
                                                label={concept.difficulty}
                                                color={difficultyColors[concept.difficulty as keyof typeof difficultyColors]}
                                                size="small"
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        ID: {concept.id}
                                    </Typography>
                                    {concept.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.primary"
                                            sx={{
                                                mb: 1.5,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {concept.description}
                                        </Typography>
                                    )}
                                    {concept.category && (
                                        <Typography variant="body2" color="primary" gutterBottom>
                                            📚 {concept.category}
                                        </Typography>
                                    )}
                                    {concept.tags && concept.tags.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                            {concept.tags.map((tag, idx) => (
                                                <Chip key={idx} label={tag} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            onClick={() => openEditModal(concept)}
                                            fullWidth
                                            size="small"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => openDeleteDialog(concept)}
                                            fullWidth
                                            size="small"
                                        >
                                            Delete
                                        </Button>
                                    </Box>
                                </Paper>
                            ))}
                        </AnimatePresence>
                    </Box>
                )}

                {/* Empty State */}
                {!loading && !error && concepts.length === 0 && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        sx={{ textAlign: 'center', py: 10 }}
                    >
                        <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
                            📚
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="text.primary" gutterBottom>
                            No concepts found
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Get started by creating your first concept
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateModal}
                            sx={{
                                mt: 3,
                                background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #1565c0 0%, #4527a0 100%)',
                                },
                            }}
                        >
                            Add New Concept
                        </Button>
                    </Box>
                )
                }

                {/* Pagination */}
                {
                    !loading && !error && totalPages > 1 && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}
                        >
                            <Button
                                variant="outlined"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Typography color="text.primary">
                                Page {page} of {totalPages}
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </Box>
                    )
                }
            </Container >

            {/* Create/Edit Modal */}
            < Dialog
                open={modalMode !== null}
                onClose={closeModal}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    component: motion.div,
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h5" fontWeight="bold">
                            {modalMode === 'create' ? '+ Add New Concept' : '✏️ Edit Concept'}
                        </Typography>
                        <IconButton onClick={closeModal} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Concept ID"
                            required
                            disabled={modalMode === 'edit'}
                            value={formData.concept_id}
                            onChange={(e) => setFormData({ ...formData, concept_id: e.target.value })}
                            placeholder="e.g., oop_concepts"
                            fullWidth
                        />
                        <TextField
                            label="Label"
                            required
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="e.g., Object-Oriented Programming"
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the concept..."
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    label="Category"
                                >
                                    <MenuItem value="">Select category</MenuItem>
                                    {categories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Difficulty</InputLabel>
                                <Select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                    label="Difficulty"
                                >
                                    <MenuItem value="">Select difficulty</MenuItem>
                                    {difficulties.map((diff) => (
                                        <MenuItem key={diff} value={diff}>
                                            {diff}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            label="Tags (comma-separated)"
                            value={(formData.tags || []).join(', ')}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                                })
                            }
                            placeholder="e.g., programming, design patterns"
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeModal} variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(90deg, #1976d2 0%, #5e35b1 100%)',
                            '&:hover': {
                                background: 'linear-gradient(90deg, #1565c0 0%, #4527a0 100%)',
                            },
                        }}
                    >
                        {modalMode === 'create' ? 'Create Concept' : 'Update Concept'}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Delete Confirmation Dialog */}
            < Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon color="error" />
                        <Typography variant="h6" fontWeight="medium">
                            Delete Concept
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete "{conceptToDelete?.label}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Toast Notification */}
            < Snackbar
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
            </Snackbar >
        </Box >
    );
}
