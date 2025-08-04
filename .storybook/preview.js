import '../styles.css';
import '../portal.css';
import '../styles/progress-tracker-seamless.css';
import '../styles/progress-tracker-tabs.css';
import { BRAND } from '../config/brand.js';

/** @type { import('@storybook/html-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    // Add brand theme configuration
    backgrounds: {
      default: 'bone',
      values: [
        {
          name: 'bone',
          value: BRAND.colors.base,
        },
        {
          name: 'white',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: BRAND.colors.text,
        },
      ],
    },
    // Global types for theme switching
    globalTypes: {
      theme: {
        name: 'Theme',
        description: 'Global theme for components',
        defaultValue: 'light',
        toolbar: {
          icon: 'paintbrush',
          items: ['light', 'dark'],
          showName: true,
        },
      },
    },
  },
  decorators: [
    (Story) => {
      // Apply brand CSS variables to the document
      const cssVars = Object.entries(BRAND.colors)
        .map(([key, value]) => `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
        .join('\n  ');
      
      const styleElement = document.createElement('style');
      styleElement.textContent = `:root { ${cssVars} --font-family: ${BRAND.typography.fontFamily}; }`;
      document.head.appendChild(styleElement);
      
      return Story();
    },
  ],
};

export default preview;