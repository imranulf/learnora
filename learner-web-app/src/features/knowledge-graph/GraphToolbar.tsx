import {
    Download as DownloadIcon,
    Image as ImageIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Box, Button, FormControl, InputLabel, MenuItem, Toolbar as MuiToolbar, Select } from '@mui/material';
import { motion } from 'framer-motion';
import type { MasteryLevel } from '../../services/knowledgeGraph';

interface GraphToolbarProps {
    categories: string[];
    selectedCategory: string;
    selectedMastery: MasteryLevel | 'all';
    onCategoryChange: (category: string) => void;
    onMasteryChange: (mastery: MasteryLevel | 'all') => void;
    onRefresh: () => void;
    onExportPNG: () => void;
    onExportJSON: () => void;
    loading: boolean;
}

export default function GraphToolbar({
    categories,
    selectedCategory,
    selectedMastery,
    onCategoryChange,
    onMasteryChange,
    onRefresh,
    onExportPNG,
    onExportJSON,
    loading,
}: GraphToolbarProps) {
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            sx={{
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
            }}
        >
            <MuiToolbar sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, py: 1 }}>
                {/* Category Filter */}
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        label="Category"
                        disabled={loading}
                    >
                        <MenuItem value="all">All Categories</MenuItem>
                        {categories.map((category) => (
                            <MenuItem key={category} value={category}>
                                {category}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Mastery Filter */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Mastery</InputLabel>
                    <Select
                        value={selectedMastery}
                        onChange={(e) => onMasteryChange(e.target.value as MasteryLevel | 'all')}
                        label="Mastery"
                        disabled={loading}
                    >
                        <MenuItem value="all">All Levels</MenuItem>
                        <MenuItem value="unknown">🔴 Unknown</MenuItem>
                        <MenuItem value="learning">🟡 Learning</MenuItem>
                        <MenuItem value="known">🟢 Known</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }} />

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        onClick={onRefresh}
                        disabled={loading}
                        variant="contained"
                        startIcon={<RefreshIcon className={loading ? 'animate-spin' : ''} />}
                        size="small"
                    >
                        Refresh
                    </Button>

                    <Button
                        onClick={onExportPNG}
                        disabled={loading}
                        variant="contained"
                        color="success"
                        startIcon={<ImageIcon />}
                        size="small"
                    >
                        Export PNG
                    </Button>

                    <Button
                        onClick={onExportJSON}
                        disabled={loading}
                        variant="contained"
                        color="secondary"
                        startIcon={<DownloadIcon />}
                        size="small"
                    >
                        Export JSON
                    </Button>
                </Box>
            </MuiToolbar>
        </Box>
    );
}
