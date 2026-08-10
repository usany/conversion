import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from './EmptyState';

const meta = {
  title: 'Converter/EmptyState',
  component: EmptyState,
  argTypes: {
    message: {
      description: 'Overrides the default copy. Falls back to the "no files yet" message.',
      control: 'text',
      table: { category: 'Content' },
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Static placeholder rendered by `FileList` when `files.length === 0`.',
          'No logic, no callbacks — testid `empty-state`.',
          '',
          '**A11y panel** — decorative only. Any icon must be `aria-hidden="true"`; the message',
          'carries the meaning. Do not give it `role="status"`: `StatusBanner` owns announcements,',
          'and a second live region would double-announce.',
          '',
          'Tailwind: `flex flex-col items-center gap-2 rounded-lg border border-dashed',
          'border-slate-200 px-6 py-12 text-center text-sm text-slate-500`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default copy, used by `FileList`. */
export const Default: Story = {};

/** Any surface that needs different wording passes `message`. */
export const CustomMessage: Story = {
  args: { message: 'No markdown files yet — drop some above to get started.' },
};

/** Long copy must wrap and stay centred rather than stretching the column. */
export const LongMessage: Story = {
  args: {
    message:
      'Nothing to convert yet. Drop one or more .md or .markdown files above, then drag them into the order you want them to appear in the finished PDF.',
  },
};
