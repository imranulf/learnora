import { Brightness4, Brightness7 } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export default function DarkModeToggle() {
    const { mode, setMode } = useColorScheme();

    const toggleMode = () => {
        setMode(mode === 'light' ? 'dark' : 'light');
    };

    return (
        <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
                onClick={toggleMode}
                sx={{
                    color: mode === 'light' ? 'primary.main' : 'warning.main',
                }}
            >
                {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
        </Tooltip>
    );
}
