import { createTheme, alpha } from '@mui/material/styles'

/**
 * QuickDrop Design System
 * Inspired by: Raycast, Linear, Vercel
 *
 * Design Philosophy:
 * - High contrast for accessibility
 * - Depth through subtle shadows and glows
 * - Smooth animations with spring physics
 * - Premium feel through attention to detail
 */

// Core color palette
const colors = {
  // Brand Colors (Indigo → Violet gradient)
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Main brand color
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  // Neutral (True black base)
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    850: '#18181b',
    900: '#09090b', // Near black
    950: '#030303', // True black
  },
  // Semantic colors
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.3)',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  info: {
    main: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
}

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[400],
      dark: colors.secondary[600],
      contrastText: '#ffffff',
    },
    background: {
      default: colors.neutral[950], // True black
      paper: colors.neutral[900], // Near black
    },
    text: {
      primary: '#ffffff',
      secondary: colors.neutral[400],
      disabled: colors.neutral[600],
    },
    divider: alpha('#ffffff', 0.08),
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  },

  typography: {
    // System fonts: SF Pro (macOS), Segoe UI (Windows), Roboto (Linux)
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemiBold: 600,
    fontWeightBold: 700,

    h1: {
      fontSize: '2.25rem', // 36px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.875rem', // 30px
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem', // 13px
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.4,
      color: colors.neutral[400],
    },
  },

  shape: {
    borderRadius: 12, // Increased from default 4px
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Add gradient background
          '&::before': {
            content: '""',
            position: 'fixed',
            top: '-20%',
            left: '-10%',
            width: '60%',
            height: '60%',
            background: `radial-gradient(circle, ${alpha(colors.primary[500], 0.15)} 0%, transparent 70%)`,
            zIndex: -1,
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'fixed',
            bottom: '-20%',
            right: '-10%',
            width: '60%',
            height: '60%',
            background: `radial-gradient(circle, ${alpha(colors.secondary[500], 0.15)} 0%, transparent 70%)`,
            zIndex: -1,
            pointerEvents: 'none',
          },
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: `0 8px 24px ${colors.primary[500]}60`,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
          boxShadow: `0 4px 14px ${colors.primary[500]}40`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})`,
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: alpha('#ffffff', 0.1),
          '&:hover': {
            borderColor: colors.primary[500],
            backgroundColor: alpha(colors.primary[500], 0.05),
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha(colors.neutral[900], 0.6),
          backdropFilter: 'blur(12px)',
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
          borderRadius: 16,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: alpha('#ffffff', 0.15),
            boxShadow: `0 12px 40px ${alpha('#000000', 0.3)}`,
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.neutral[900],
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: alpha(colors.neutral[850], 0.5),
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: alpha('#ffffff', 0.08),
            },
            '&:hover fieldset': {
              borderColor: alpha('#ffffff', 0.15),
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary[500],
              borderWidth: 1,
            },
          },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
        },
        switchBase: {
          padding: 3,
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
              opacity: 1,
              border: 0,
            },
          },
        },
        thumb: {
          width: 20,
          height: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        },
        track: {
          borderRadius: 26 / 2,
          backgroundColor: alpha('#ffffff', 0.1),
          opacity: 1,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          height: 24,
        },
        outlined: {
          borderColor: alpha('#ffffff', 0.15),
          backgroundColor: alpha(colors.neutral[850], 0.5),
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: alpha('#ffffff', 0.05),
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.neutral[800],
          borderRadius: 8,
          fontSize: '0.75rem',
          padding: '6px 12px',
          boxShadow: `0 4px 12px ${alpha('#000000', 0.3)}`,
        },
      },
    },
  },
})

// Export colors for use in components
export { colors }
