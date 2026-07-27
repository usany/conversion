import type { Preview } from '@storybook/nextjs-vite';

import '../app/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // 'todo' surfaces violations in the a11y panel without failing the run.
    // Flip to 'error' once component-writer's implementations are green.
    a11y: { test: 'todo' },
    docs: { toc: true },
  },
  tags: ['autodocs'],
};

export default preview;
