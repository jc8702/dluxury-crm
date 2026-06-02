/**
 * Design System — Tokens canônicos
 *
 * Fonte única de verdade para cores, espaçamento, tipografia,
 * sombras e raio de borda. Os valores são consumidos:
 *   - Diretamente em código React/TS via `import { designSystem } from '@/styles/design-system'`
 *   - Via CSS custom properties expostas em `src/styles/global.css`
 *
 * Convenção de nomes: este módulo coexiste com o design system legado
 * baseado em Tailwind v4 (`src/index.css`). Os tokens aqui usam o prefixo
 * semântico de categoria (`colors.primary.500`, `spacing.md`) e as CSS
 * vars correspondentes usam `--ds-*` para evitar colisão com `--primary`,
 * `--secondary`, etc. já definidos no tema Tailwind.
 */

export const designSystem = {
  colors: {
    primary: {
      50: '#F0F7FF',
      100: '#E0EFFF',
      500: '#0D66CC',
      600: '#0D5FB8',
      900: '#003D82',
    },
    secondary: {
      50: '#F0FFFB',
      500: '#00A99D',
      600: '#008B84',
      900: '#004D47',
    },
    accent: '#E2AC00',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
      disabled: '#CCCCCC',
    },
    border: '#E0E0E0',
    error: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    info: '#17A2B8',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSizes: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
} as const;

export const designSystemDark = {
  colors: {
    primary: {
      50: '#001A33',
      100: '#002952',
      500: '#3D8BFF',
      600: '#0D66CC',
      900: '#0D66CC',
    },
    secondary: {
      50: '#001F1B',
      500: '#2DD4BF',
      600: '#00A99D',
      900: '#5EEAD4',
    },
    accent: '#F59E0B',
    background: '#0B0F19',
    surface: '#111827',
    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
      disabled: '#4B5563',
    },
    border: '#1F2937',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSizes: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 4px 6px rgba(0,0,0,0.5)',
    lg: '0 10px 15px rgba(0,0,0,0.6)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
} as const;

export type DesignSystemDark = typeof designSystemDark;

export type DesignSystem = typeof designSystem;
export type ColorScale = keyof typeof designSystem.colors.primary;
export type Spacing = keyof typeof designSystem.spacing;
export type FontSize = keyof typeof designSystem.typography.fontSizes;
export type FontWeight = keyof typeof designSystem.typography.fontWeights;
export type LineHeight = keyof typeof designSystem.typography.lineHeights;
export type Shadow = keyof typeof designSystem.shadows;
export type Radius = keyof typeof designSystem.borderRadius;

export default designSystem;
