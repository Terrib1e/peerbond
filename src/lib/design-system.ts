// PeerBond Design System
// Unified design tokens and utilities for consistent UI across portals

export const designTokens = {
  // Color schemes for different portals
  portals: {
    member: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        900: '#1e3a8a',
      },
      accent: '#3b82f6',
      text: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    therapist: {
      primary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        900: '#14532d',
      },
      accent: '#16a34a',
      text: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    },
    admin: {
      primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        500: '#a855f7',
        600: '#9333ea',
        700: '#7c3aed',
        900: '#581c87',
      },
      accent: '#9333ea',
      text: '#7c3aed',
      bg: '#faf5ff',
      border: '#d8b4fe',
    },
  },

  // Common colors
  colors: {
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
    },
    yellow: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
    },
  },

  // Typography
  typography: {
    fonts: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Menlo', 'Monaco', 'monospace'],
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    base: '1rem',   // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },

  // Layout
  layout: {
    maxWidth: {
      container: '1280px', // 7xl
      content: '768px',    // 3xl
      form: '512px',       // 2xl
    },
    borderRadius: {
      sm: '0.25rem',  // 4px
      base: '0.375rem', // 6px
      lg: '0.5rem',   // 8px
      xl: '0.75rem',  // 12px
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  },

  // Component variants
  components: {
    card: {
      base: 'bg-white rounded-lg shadow-sm border border-gray-200',
      hover: 'hover:shadow-md transition-shadow duration-200',
      padding: {
        sm: 'p-4',
        base: 'p-6',
        lg: 'p-8',
      },
    },
    button: {
      base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
      sizes: {
        sm: 'px-3 py-2 text-sm',
        base: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
      variants: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      },
    },
    input: {
      base: 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    },
  },
};

// Utility functions for design system
export const getPortalTheme = (portalType: 'member' | 'therapist' | 'admin') => {
  return designTokens.portals[portalType];
};

export const getComponentClasses = {
  card: (variant: 'base' | 'hover' = 'base', padding: 'sm' | 'base' | 'lg' = 'base') => {
    const classes = [designTokens.components.card.base];
    if (variant === 'hover') classes.push(designTokens.components.card.hover);
    classes.push(designTokens.components.card.padding[padding]);
    return classes.join(' ');
  },

  button: (
    variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary',
    size: 'sm' | 'base' | 'lg' = 'base'
  ) => {
    return [
      designTokens.components.button.base,
      designTokens.components.button.sizes[size],
      designTokens.components.button.variants[variant],
    ].join(' ');
  },

  input: (hasError = false) => {
    return hasError
      ? `${designTokens.components.input.base} ${designTokens.components.input.error}`
      : designTokens.components.input.base;
  },
};

// Portal-specific styling utilities
export const getPortalStyles = (portalType: 'member' | 'therapist' | 'admin') => {
  const theme = getPortalTheme(portalType);

  return {
    headerBg: `bg-${theme.primary[50]}`,
    headerBorder: `border-${theme.primary[100]}`,
    headerText: `text-${theme.primary[700]}`,
    accentBg: `bg-${theme.primary[600]}`,
    accentText: `text-${theme.primary[600]}`,
    accentHover: `hover:bg-${theme.primary[700]}`,
    linkColor: `text-${theme.primary[600]} hover:text-${theme.primary[700]}`,
    badgeColor: `bg-${theme.primary[100]} text-${theme.primary[700]}`,
    cardBorder: `border-${theme.primary[100]}`,
    cardHover: `hover:border-${theme.primary[200]}`,
    buttonPrimary: `bg-${theme.primary[600]} hover:bg-${theme.primary[700]} text-white`,
    buttonSecondary: `bg-${theme.primary[50]} hover:bg-${theme.primary[100]} text-${theme.primary[700]}`,
    statIcon: `bg-${theme.primary[100]} text-${theme.primary[600]}`,
    tabActive: `border-${theme.primary[600]} text-${theme.primary[600]}`,
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
  };
};

// Enhanced component utility functions
export const getPortalComponentClasses = (portalType: 'member' | 'therapist' | 'admin') => {
  const styles = getPortalStyles(portalType);
  
  return {
    // Enhanced card styling with portal theming
    card: (variant: 'base' | 'hover' | 'interactive' = 'base', padding: 'sm' | 'base' | 'lg' = 'base') => {
      const baseCard = 'bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200';
      const variants = {
        base: baseCard,
        hover: `${baseCard} hover:shadow-md`,
        interactive: `${baseCard} ${styles.cardHover} hover:shadow-md cursor-pointer`,
      };
      const paddings = {
        sm: 'p-4',
        base: 'p-6', 
        lg: 'p-8',
      };
      return `${variants[variant]} ${paddings[padding]}`;
    },

    // Portal-themed buttons
    button: (variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary', size: 'sm' | 'base' | 'lg' = 'base') => {
      const baseButton = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
      const sizes = {
        sm: 'px-3 py-2 text-sm',
        base: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      };
      const variants = {
        primary: styles.buttonPrimary,
        secondary: styles.buttonSecondary,
        outline: `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-${portalType === 'member' ? 'blue' : portalType === 'therapist' ? 'green' : 'purple'}-500`,
        ghost: `text-gray-700 hover:bg-gray-100 focus:ring-${portalType === 'member' ? 'blue' : portalType === 'therapist' ? 'green' : 'purple'}-500`,
      };
      return `${baseButton} ${sizes[size]} ${variants[variant]}`;
    },

    // Portal-themed navigation tabs
    navigationTab: (isActive: boolean) => {
      const baseTab = 'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2';
      return `${baseTab} ${isActive ? styles.tabActive : styles.tabInactive}`;
    },

    // Portal-themed stats card icon
    statsCardIcon: () => {
      return `flex-shrink-0 p-2 rounded-full ${styles.statIcon}`;
    },
  };
};

export default designTokens;