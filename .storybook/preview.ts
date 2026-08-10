import type { Preview } from '@storybook/react-vite';

import '../app/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: 'todo' },
    docs: { toc: true },
  },
  tags: ['autodocs'],
};

export default preview;
