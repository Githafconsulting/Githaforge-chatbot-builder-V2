/**
 * Material UI Theme Configuration for Githaforge
 * Features glassmorphism, light/dark modes, and brand colors
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Githaforge brand colors
const brandColors = {
  primary: {
    main: '#1e40af', // blue-800
    light: '#3b82f6', // blue-500
    dark: '#1e3a8a', // blue-900
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#0ea5e9', // sky-500
    light: '#38bdf8', // sky-400
    dark: '#0284c7', // sky-600
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981', // emerald-500
    light: '#34d399', // emerald-400
    dark: '#059669', // emerald-600
  },
  warning: {
    main: '#f59e0b', // amber-500
    light: '#fbbf24', // amber-400
    dark: '#d97706', // amber-600
  },
  error: {
    main: '#ef4444', // red-500
    light: '#f87171', // red-400
    dark: '#dc2626', // red-600
  },
  info: {
    main: '#06b6d4', // cyan-500
    light: '#22d3ee', // cyan-400
    dark: '#0891b2', // cyan-600
  },
};

// Glassmorphism styles helper
const glassmorphism = (isDark: boolean) => ({
  background: isDark
    ? 'rgba(30, 41, 59, 0.7)' // slate-800 with transparency
    : 'rgba(255, 255, 255, 0.7)', // white with transparency
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)'}`,
  boxShadow: isDark
    ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
});

// Dark theme configuration
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    ...brandColors,
    background: {
      default: '#0f172a', // slate-900
      paper: '#1e293b', // slate-800
    },
    text: {
      primary: '#f1f5f9', // slate-100
      secondary: '#cbd5e1', // slate-300
      disabled: '#64748b', // slate-500
    },
    divider: 'rgba(148, 163, 184, 0.12)', // slate-400 with transparency
  },
  typography: {
    fontFamily: '"Manrope", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', // Disable uppercase
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          ...glassmorphism(true),
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...glassmorphism(true),
          backgroundImage: 'none', // Disable default Material UI gradient
        },
        elevation1: {
          boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        },
        elevation2: {
          boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.3)',
        },
        elevation3: {
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: '0 4px 14px 0 rgba(30, 64, 175, 0.35)',
          '&:hover': {
            boxShadow: '0 6px 20px 0 rgba(30, 64, 175, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        filled: {
          ...glassmorphism(true),
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            ...glassmorphism(true),
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          ...glassmorphism(true),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...glassmorphism(true),
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          ...glassmorphism(true),
          boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...glassmorphism(true),
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          ...glassmorphism(true),
          borderRadius: 12,
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '2px solid rgba(148, 163, 184, 0.2)',
            backgroundColor: 'rgba(30, 64, 175, 0.1)',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        },
      },
    },
  },
};

// Light theme configuration
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    ...brandColors,
    background: {
      default: '#f8fafc', // slate-50
      paper: '#ffffff',
    },
    text: {
      primary: '#000000', // pure black
      secondary: '#475569', // slate-600
      disabled: '#94a3b8', // slate-400
    },
    divider: 'rgba(148, 163, 184, 0.2)',
  },
  typography: darkThemeOptions.typography,
  shape: darkThemeOptions.shape,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          ...glassmorphism(false),
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.25)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...glassmorphism(false),
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.15)',
        },
        elevation3: {
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
        },
      },
    },
    MuiButton: darkThemeOptions.components?.MuiButton,
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        filled: {
          ...glassmorphism(false),
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            ...glassmorphism(false),
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          ...glassmorphism(false),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...glassmorphism(false),
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          ...glassmorphism(false),
          boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...glassmorphism(false),
          borderRight: '1px solid rgba(148, 163, 184, 0.2)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          ...glassmorphism(false),
          borderRadius: 12,
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '2px solid rgba(148, 163, 184, 0.25)',
            backgroundColor: 'rgba(30, 64, 175, 0.05)',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
          },
        },
      },
    },
  },
};

// Export theme creators
export const createDarkTheme = () => createTheme(darkThemeOptions);
export const createLightTheme = () => createTheme(lightThemeOptions);

// Default export (dark theme)
export default createDarkTheme();
