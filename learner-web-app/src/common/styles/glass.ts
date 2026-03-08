/**
 * Glassmorphism style utilities for MUI sx prop.
 *
 * Usage:
 *   import { glassSx, glassCardSx } from '../common/styles/glass';
 *   <Paper sx={{ ...glassSx, p: 3 }} />
 *   <Card sx={{ ...glassCardSx(hoverColor) }} />
 */
import type { SxProps, Theme } from '@mui/material/styles';

/** Base glassmorphism surface */
export const glassSx: SxProps<Theme> = {
  background: (theme: Theme) =>
    theme.palette.mode === 'dark'
      ? 'rgba(28, 28, 38, 0.8)'
      : 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: (theme: Theme) =>
    `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)'}`,
};

/** Glass card with hover lift + glow */
export const glassCardSx = (hoverColor = 'rgba(102, 126, 234, 0.15)'): SxProps<Theme> => ({
  ...glassSx,
  borderRadius: 3,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: (theme: Theme) =>
      theme.palette.mode === 'dark'
        ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(102, 126, 234, 0.3)`
        : `0 12px 28px ${hoverColor}`,
    borderColor: 'primary.main',
    background: (theme: Theme) =>
      theme.palette.mode === 'dark'
        ? 'rgba(35, 35, 50, 0.95)'
        : 'rgba(255, 255, 255, 0.85)',
  },
});
