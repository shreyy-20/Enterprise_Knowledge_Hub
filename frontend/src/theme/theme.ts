import { createTheme, alpha, type ThemeOptions } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: { fontWeight: 800, fontSize: '2.5rem', lineHeight: 1.2, letterSpacing: '-0.025em' },
  h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
  subtitle1: { fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 },
  subtitle2: { fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.5 },
  body1: { fontSize: '0.938rem', lineHeight: 1.6 },
  body2: { fontSize: '0.85rem', lineHeight: 1.6 },
  button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
  caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  overline: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
};

const sharedShape = { borderRadius: 12 };

const sharedTransitions = {
  duration: { shortest: 150, shorter: 200, short: 250, standard: 300, complex: 375, enteringScreen: 225, leavingScreen: 195 },
};

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
  secondary: { main: '#14b8a6', light: '#2dd4bf', dark: '#0d9488', contrastText: '#ffffff' },
  error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
  warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
  success: { main: '#10b981', light: '#34d399', dark: '#059669' },
  background: { default: '#f8f9fc', paper: '#ffffff' },
  text: { primary: '#1e1b4b', secondary: '#64748b', disabled: '#94a3b8' },
  divider: alpha('#6366f1', 0.08),
  action: { hover: alpha('#6366f1', 0.04), selected: alpha('#6366f1', 0.08), disabled: alpha('#1e1b4b', 0.26), disabledBackground: alpha('#1e1b4b', 0.12), focus: alpha('#6366f1', 0.12) },
};

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#ffffff' },
  secondary: { main: '#2dd4bf', light: '#5eead4', dark: '#14b8a6', contrastText: '#000000' },
  error: { main: '#f87171', light: '#fca5a5', dark: '#ef4444' },
  warning: { main: '#fbbf24', light: '#fcd34d', dark: '#f59e0b' },
  info: { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6' },
  success: { main: '#34d399', light: '#6ee7b7', dark: '#10b981' },
  background: { default: '#0a0a1a', paper: '#111128' },
  text: { primary: '#e2e8f0', secondary: '#94a3b8', disabled: '#475569' },
  divider: alpha('#818cf8', 0.12),
  action: { hover: alpha('#818cf8', 0.08), selected: alpha('#818cf8', 0.16), disabled: alpha('#e2e8f0', 0.26), disabledBackground: alpha('#e2e8f0', 0.12), focus: alpha('#818cf8', 0.12) },
};

function getComponents(mode: 'light' | 'dark'): ThemeOptions['components'] {
  const isDark = mode === 'dark';
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: isDark ? alpha('#818cf8', 0.3) : alpha('#6366f1', 0.2), borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb:hover': { background: isDark ? alpha('#818cf8', 0.5) : alpha('#6366f1', 0.4) },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': { transform: 'translateY(-1px)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          boxShadow: `0 4px 14px 0 ${alpha('#6366f1', 0.4)}`,
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
            boxShadow: `0 6px 20px 0 ${alpha('#6366f1', 0.5)}`,
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
          boxShadow: `0 4px 14px 0 ${alpha('#14b8a6', 0.4)}`,
          '&:hover': {
            background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
            boxShadow: `0 6px 20px 0 ${alpha('#14b8a6', 0.5)}`,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${isDark ? alpha('#818cf8', 0.1) : alpha('#6366f1', 0.08)}`,
          background: isDark
            ? alpha('#1e1b4b', 0.4)
            : alpha('#ffffff', 0.8),
          backdropFilter: 'blur(20px)',
          boxShadow: isDark
            ? `0 4px 30px ${alpha('#000000', 0.3)}`
            : `0 4px 30px ${alpha('#6366f1', 0.07)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#818cf8' : '#6366f1',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, fontSize: '0.8rem' },
        filled: {
          background: isDark ? alpha('#818cf8', 0.15) : alpha('#6366f1', 0.1),
          color: isDark ? '#a5b4fc' : '#4f46e5',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.8rem',
          fontWeight: 500,
          background: isDark ? '#1e1b4b' : '#312e81',
          padding: '6px 12px',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha('#6366f1', isDark ? 0.2 : 0.1)} 0%, ${alpha('#a855f7', isDark ? 0.15 : 0.07)} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${alpha('#6366f1', isDark ? 0.25 : 0.15)} 0%, ${alpha('#a855f7', isDark ? 0.2 : 0.1)} 100%)`,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: `1px solid ${isDark ? alpha('#818cf8', 0.15) : alpha('#6366f1', 0.1)}`,
          background: isDark ? '#151530' : '#ffffff',
          boxShadow: `0 25px 60px ${alpha('#000', 0.3)}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 44,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: isDark ? alpha('#818cf8', 0.1) : alpha('#6366f1', 0.08),
        },
        bar: {
          borderRadius: 8,
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.65rem',
        },
      },
    },
  };
}

export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: mode === 'light' ? lightPalette : darkPalette,
    typography: sharedTypography,
    shape: sharedShape,
    transitions: sharedTransitions,
    components: getComponents(mode),
    shadows: [
      'none',
      `0 1px 3px ${alpha('#6366f1', 0.08)}`,
      `0 2px 6px ${alpha('#6366f1', 0.1)}`,
      `0 4px 12px ${alpha('#6366f1', 0.12)}`,
      `0 6px 16px ${alpha('#6366f1', 0.14)}`,
      `0 8px 24px ${alpha('#6366f1', 0.16)}`,
      `0 12px 32px ${alpha('#6366f1', 0.18)}`,
      `0 16px 40px ${alpha('#6366f1', 0.2)}`,
      `0 20px 48px ${alpha('#6366f1', 0.22)}`,
      `0 24px 56px ${alpha('#6366f1', 0.24)}`,
      `0 28px 64px ${alpha('#6366f1', 0.26)}`,
      `0 32px 72px ${alpha('#6366f1', 0.28)}`,
      `0 36px 80px ${alpha('#6366f1', 0.3)}`,
      `0 40px 88px ${alpha('#6366f1', 0.32)}`,
      `0 44px 96px ${alpha('#6366f1', 0.34)}`,
      `0 48px 104px ${alpha('#6366f1', 0.36)}`,
      `0 52px 112px ${alpha('#6366f1', 0.38)}`,
      `0 56px 120px ${alpha('#6366f1', 0.4)}`,
      `0 60px 128px ${alpha('#6366f1', 0.42)}`,
      `0 64px 136px ${alpha('#6366f1', 0.44)}`,
      `0 68px 144px ${alpha('#6366f1', 0.46)}`,
      `0 72px 152px ${alpha('#6366f1', 0.48)}`,
      `0 76px 160px ${alpha('#6366f1', 0.5)}`,
      `0 80px 168px ${alpha('#6366f1', 0.52)}`,
      `0 84px 176px ${alpha('#6366f1', 0.54)}`,
    ] as unknown as ThemeOptions['shadows'],
  });
}
