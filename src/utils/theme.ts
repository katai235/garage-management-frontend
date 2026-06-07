// ============================================
// GMS Design System — Bold & Professional
// Deep navy + vibrant blue + amber accents
// ============================================

export const Colors = {
  // Primary — deep royal blue
  primary: '#1A56DB',
  primaryDark: '#1245B8',
  primaryLight: '#3B82F6',
  primaryAlpha: 'rgba(26, 86, 219, 0.1)',
  primaryAlphaDark: 'rgba(26, 86, 219, 0.2)',

  // Accent — amber/orange for highlights
  accent: '#F59E0B',
  accentLight: 'rgba(245, 158, 11, 0.15)',

  // Status colors
  success: '#059669',
  successLight: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  dangerLight: 'rgba(220, 38, 38, 0.12)',
  info: '#0891B2',
  infoLight: 'rgba(8, 145, 178, 0.12)',

  // Service status
  statusWaiting: '#D97706',
  statusInService: '#0891B2',
  statusReady: '#059669',
  statusCompleted: '#6B7280',
  statusCancelled: '#DC2626',

  // Background — slightly warm off-white
  background: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F7FF',
  surfaceTertiary: '#EEF2FF',
  border: '#E0E7FF',
  borderLight: '#EEF2FF',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Sidebar / dark areas
  sidebarBg: '#0F172A',
  sidebarText: '#CBD5E1',
  sidebarTextActive: '#FFFFFF',
  sidebarActive: '#1A56DB',

  // Dark theme
  darkBackground: '#0F172A',
  darkSurface: '#1E293B',
  darkSurfaceSecondary: '#334155',
  darkBorder: '#334155',
  darkText: '#F1F5F9',
  darkTextSecondary: '#94A3B8',
};

export const Typography = {
  fontRegular: 'System',
  fontMedium: 'System',
  fontBold: 'System',
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24,
  '2xl': 32, '3xl': 40, '4xl': 48,
};

export const BorderRadius = {
  sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const getStatusColor = (status: string) => {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    'waiting':      { bg: 'rgba(217,119,6,0.12)',   text: '#D97706', dot: '#D97706' },
    'in-service':   { bg: 'rgba(8,145,178,0.12)',   text: '#0891B2', dot: '#0891B2' },
    'in_service':   { bg: 'rgba(8,145,178,0.12)',   text: '#0891B2', dot: '#0891B2' },
    'ready':        { bg: 'rgba(5,150,105,0.12)',   text: '#059669', dot: '#059669' },
    'completed':    { bg: '#EEF2FF',                text: '#6B7280', dot: '#6B7280' },
    'cancelled':    { bg: 'rgba(220,38,38,0.12)',   text: '#DC2626', dot: '#DC2626' },
    'pending':      { bg: 'rgba(217,119,6,0.12)',   text: '#D97706', dot: '#D97706' },
    'confirmed':    { bg: 'rgba(5,150,105,0.12)',   text: '#059669', dot: '#059669' },
    'in-progress':  { bg: 'rgba(8,145,178,0.12)',   text: '#0891B2', dot: '#0891B2' },
    'no-show':      { bg: 'rgba(220,38,38,0.12)',   text: '#DC2626', dot: '#DC2626' },
    'paid':         { bg: 'rgba(5,150,105,0.12)',   text: '#059669', dot: '#059669' },
    'unpaid':       { bg: 'rgba(220,38,38,0.12)',   text: '#DC2626', dot: '#DC2626' },
    'partial':      { bg: 'rgba(217,119,6,0.12)',   text: '#D97706', dot: '#D97706' },
    'draft':        { bg: '#EEF2FF',                text: '#6B7280', dot: '#6B7280' },
    'sent':         { bg: 'rgba(26,86,219,0.10)',   text: '#1A56DB', dot: '#1A56DB' },
    'active':       { bg: 'rgba(5,150,105,0.12)',   text: '#059669', dot: '#059669' },
    'inactive':     { bg: '#EEF2FF',                text: '#6B7280', dot: '#6B7280' },
    'in-stock':     { bg: 'rgba(5,150,105,0.12)',   text: '#059669', dot: '#059669' },
    'low-stock':    { bg: 'rgba(217,119,6,0.12)',   text: '#D97706', dot: '#D97706' },
    'out-of-stock': { bg: 'rgba(220,38,38,0.12)',   text: '#DC2626', dot: '#DC2626' },
  };
  return map[status] || { bg: '#EEF2FF', text: '#6B7280', dot: '#6B7280' };
};
