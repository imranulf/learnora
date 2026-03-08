/**
 * Shared card/surface style utilities for MUI sx prop.
 *
 * MUI v7 uses CSS variables for theming — do NOT check theme.palette.mode
 * in sx callbacks (it always returns 'light'). Let MUI handle backgrounds.
 *
 * Usage:
 *   <Paper sx={[glassSx, { p: 3 }]} />
 *   <Card sx={[glassCardSx(), { position: 'relative' }]} />
 */
import type { SxProps, Theme } from '@mui/material/styles';

/** Clean surface — let MUI handle background, just add subtle border */
export const glassSx: SxProps<Theme> = {
  borderRadius: 3,
};

/** Card with hover lift + glow effect */
export const glassCardSx = (_hoverColor?: string): SxProps<Theme> => ({
  borderRadius: 3,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.18)',
    borderColor: 'primary.main',
  },
});
