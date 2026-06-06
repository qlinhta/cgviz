import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx}', './index.html'],

  theme: {
    /* ---------------------------------------------------------------- */
    /* Font families                                                    */
    /* ---------------------------------------------------------------- */
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif',
      ],
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'Cascadia Code',
        'monospace',
      ],
    },

    extend: {
      /* -------------------------------------------------------------- */
      /* Colors — mapped to CSS custom properties for theme switching    */
      /* -------------------------------------------------------------- */
      colors: {
        bg: {
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary:  'var(--color-bg-tertiary)',
          elevated:  'var(--color-bg-elevated)',
        },
        graph: {
          bg: 'var(--color-graph-bg)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover:   'var(--color-border-hover)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-hover)',
          muted:   'var(--color-accent-muted)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger:  'var(--color-danger)',

        /* Node kind colors */
        node: {
          file:        'var(--node-file)',
          class:       'var(--node-class)',
          function:    'var(--node-function)',
          method:      'var(--node-method)',
          variable:    'var(--node-variable)',
          import:      'var(--node-import)',
          enum:        'var(--node-enum)',
          struct:      'var(--node-struct)',
          trait:       'var(--node-trait)',
          'type-alias':  'var(--node-type-alias)',
          'enum-member': 'var(--node-enum-member)',
        },

        /* Edge kind colors */
        edge: {
          contains:     'var(--edge-contains)',
          calls:        'var(--edge-calls)',
          imports:      'var(--edge-imports)',
          instantiates: 'var(--edge-instantiates)',
          extends:      'var(--edge-extends)',
        },
      },

      /* -------------------------------------------------------------- */
      /* Spacing (4px base, named stops)                                */
      /* -------------------------------------------------------------- */
      spacing: {
        '4.5': '1.125rem', // 18px — useful between 4 and 5
        '13':  '3.25rem',  // 52px
        '15':  '3.75rem',  // 60px
        '18':  '4.5rem',   // 72px
      },

      /* -------------------------------------------------------------- */
      /* Border radius                                                  */
      /* -------------------------------------------------------------- */
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      /* -------------------------------------------------------------- */
      /* Box shadows                                                    */
      /* -------------------------------------------------------------- */
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: '0 0 20px var(--color-accent-muted)',
      },

      /* -------------------------------------------------------------- */
      /* Font sizes                                                     */
      /* -------------------------------------------------------------- */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px
        xs:    ['0.75rem',   { lineHeight: '1rem' }],    // 12px
        sm:    ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        base:  ['0.875rem',  { lineHeight: '1.5rem' }],  // 14px
        lg:    ['1rem',      { lineHeight: '1.5rem' }],   // 16px
        xl:    ['1.125rem',  { lineHeight: '1.75rem' }],  // 18px
        '2xl': ['1.25rem',   { lineHeight: '1.75rem' }],  // 20px
        '3xl': ['1.5rem',    { lineHeight: '2rem' }],     // 24px
      },

      /* -------------------------------------------------------------- */
      /* Transitions                                                    */
      /* -------------------------------------------------------------- */
      transitionDuration: {
        fast:   '100ms',
        normal: '200ms',
        slow:   '300ms',
        layout: '500ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      /* -------------------------------------------------------------- */
      /* Animations                                                     */
      /* -------------------------------------------------------------- */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },

      animation: {
        'fade-in':    'fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':   'slide-up 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slide-down 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in':   'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow':  'spin-slow 3s linear infinite',
      },

      /* -------------------------------------------------------------- */
      /* Z-index scale                                                  */
      /* -------------------------------------------------------------- */
      zIndex: {
        'graph':    '0',
        'panel':    '10',
        'toolbar':  '20',
        'overlay':  '30',
        'dropdown': '40',
        'modal':    '50',
        'toast':    '60',
      },
    },
  },

  plugins: [],
};

export default config;
