import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  // react-docgen-typescript reads the TypeScript compiler API, which TypeScript 7
  // no longer exposes. The babel-based parser still produces the autodocs prop tables.
  typescript: {
    reactDocgen: 'react-docgen',
  },
};

export default config;
