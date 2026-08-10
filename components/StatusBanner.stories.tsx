import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { REJECTION_MESSAGES } from '@/lib/constants';
import { StatusBanner } from './StatusBanner';

const meta = {
  title: 'Converter/StatusBanner',
  component: StatusBanner,
  args: {
    banner: { variant: 'info', message: 'Reading 3 files…' },
    onDismiss: fn(),
  },
  argTypes: {
    banner: {
      description: '`BannerState | null`. `null` renders nothing at all — not an empty wrapper.',
      table: { category: 'Data' },
    },
    onDismiss: {
      description: 'Clears the banner in `useConverter`.',
      table: { category: 'Events' },
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Single feedback surface for validation rejections and conversion outcomes. Testid `status-banner`.',
          '',
          '**Contract** — `data-variant="info" | "success" | "error"` on the region;',
          'dismiss button testid `dismiss-banner`.',
          '',
          '**A11y panel** — `role="alert"` for `error` (assertive: a failed conversion must',
          'interrupt), `role="status"` for `info` and `success` (polite). The dismiss button needs',
          'an accessible name matching `/dismiss|close/i` — an unlabelled "×" fails axe. Variant',
          'must not be signalled by colour alone: pair each with an `aria-hidden` icon and keep the',
          'text ≥ 4.5:1 against the tinted background.',
          '',
          'Tailwind base: `flex items-start gap-3 rounded-lg border p-4 text-sm`, with the variant',
          'applied off `data-[variant=…]:`',
          '— info `border-slate-200 bg-slate-50 text-slate-700`',
          '— success `border-emerald-200 bg-emerald-50 text-emerald-800`',
          '— error `border-rose-200 bg-rose-50 text-rose-800`',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof StatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Neutral progress message, announced politely. */
export const Info: Story = {
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByTestId('status-banner');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('data-variant', 'info');
  },
};

/** Conversion finished and the download fired. */
export const Success: Story = {
  args: {
    banner: { variant: 'success', message: 'converted.pdf is ready — check your downloads.' },
  },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByTestId('status-banner');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('data-variant', 'success');
  },
};

/** Conversion failed. Assertive, because the user is waiting on it. */
export const Error: Story = {
  args: { banner: { variant: 'error', message: 'Conversion failed. Please try again.' } },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByTestId('status-banner');
    expect(region).toHaveAttribute('role', 'alert');
    expect(region).toHaveAttribute('data-variant', 'error');
  },
};

/** One rejected file. `details` is where `REJECTION_MESSAGES` surfaces. */
export const SingleDetail: Story = {
  args: {
    banner: {
      variant: 'error',
      message: '1 file was rejected',
      details: [`notes.txt — ${REJECTION_MESSAGES['invalid-extension']}`],
    },
  },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(1);
  },
};

/** Several rejections at once — rendered as a `<ul>`, one reason per file. */
export const MultipleDetails: Story = {
  args: {
    banner: {
      variant: 'error',
      message: '4 files were rejected',
      details: [
        `notes.txt — ${REJECTION_MESSAGES['invalid-extension']}`,
        `huge.md — ${REJECTION_MESSAGES['file-too-large']}`,
        `introduction.md — ${REJECTION_MESSAGES.duplicate}`,
        `broken.md — ${REJECTION_MESSAGES['read-error']}`,
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tailwind: `mt-2 list-disc space-y-1 pl-5 text-xs`. Long filenames wrap; they must not truncate — the name is the whole point of the message.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(4);
  },
};

/** Partial acceptance: some files went through, some did not. */
export const InfoWithDetails: Story = {
  args: {
    banner: {
      variant: 'info',
      message: '2 files added, 1 skipped',
      details: [`archive.zip — ${REJECTION_MESSAGES['invalid-extension']}`],
    },
  },
};

/** `banner={null}` — the component returns `null`, leaving no layout gap behind. */
export const Hidden: Story = {
  args: { banner: null },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).queryByTestId('status-banner')).not.toBeInTheDocument();
  },
};

/** Dismissal is always available, on every variant. */
export const Dismissible: Story = {
  play: async ({ args, canvasElement }) => {
    const dismiss = within(canvasElement).getByTestId('dismiss-banner');
    expect(dismiss).toHaveAccessibleName(/dismiss|close/i);

    await userEvent.click(dismiss);
    expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};
