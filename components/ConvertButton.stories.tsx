import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ConvertButton } from './ConvertButton';

const meta = {
  title: 'Converter/ConvertButton',
  component: ConvertButton,
  args: {
    fileCount: 3,
    status: 'idle',
    onConvert: fn(),
  },
  argTypes: {
    fileCount: {
      description: 'Drives both the label pluralisation and the disabled state.',
      control: { type: 'number', min: 0, max: 50 },
      table: { category: 'Data' },
    },
    status: {
      description: 'From `useConverter`. Only `converting` disables the button.',
      control: 'select',
      options: ['idle', 'converting', 'success', 'error'],
      table: { category: 'State' },
    },
    onConvert: {
      description: 'Fires once per click while enabled.',
      table: { category: 'Events' },
    },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Primary action. Testid `convert-button`.',
          '',
          '**Label** — `Convert {n} file to PDF` / `Convert {n} files to PDF`. The singular case is',
          'asserted to *not* contain the string "files", so build the label from a conditional word',
          'rather than appending an "s" to a shared stem.',
          '',
          '**Disabled when** `fileCount === 0` **or** `status === "converting"`. `success` and',
          '`error` are re-runnable, so they stay enabled.',
          '',
          '**A11y panel** — `aria-busy="true"` only while converting; the spinner is',
          '`aria-hidden="true"` because the label already changes to "Converting…". Never rely on',
          '`pointer-events: none` to block clicks — use the real `disabled` attribute. Keep the',
          'disabled state ≥ 3:1 against the surface so it stays perceivable.',
          '',
          'Tailwind: `inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5',
          'py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500',
          'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ConvertButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing to convert yet — this is the disabled state users see on first load. */
export const NoFiles: Story = {
  args: { fileCount: 0 },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByTestId('convert-button');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(args.onConvert).not.toHaveBeenCalled();
  },
};

/** Singular label. Must not contain the word "files". */
export const SingleFile: Story = {
  args: { fileCount: 1 },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByTestId('convert-button');
    expect(button).toHaveTextContent('Convert 1 file to PDF');
    expect(button).not.toHaveTextContent('files');
  },
};

/** Plural label, enabled. */
export const MultipleFiles: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByTestId('convert-button');
    expect(button).toHaveTextContent('Convert 3 files to PDF');

    await userEvent.click(button);
    expect(args.onConvert).toHaveBeenCalledTimes(1);
  },
};

/** In flight: disabled, `aria-busy`, spinner, "Converting…". */
export const Converting: Story = {
  args: { status: 'converting' },
  parameters: {
    docs: {
      description: {
        story: [
          'Spinner: `<span aria-hidden="true" class="size-4 animate-spin rounded-full border-2',
          'border-white/40 border-t-white" />`. Keep the button width stable between labels',
          '(`min-w-[13rem]`) so the layout does not jump on click.',
        ].join('\n'),
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByTestId('convert-button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent(/converting/i);

    await userEvent.click(button);
    expect(args.onConvert).not.toHaveBeenCalled();
  },
};

/** After a successful download — re-runnable, so still enabled and not busy. */
export const AfterSuccess: Story = {
  args: { status: 'success' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByTestId('convert-button');
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy', 'true');
  },
};

/** After a failure — retrying is the whole point, so it must stay enabled. */
export const AfterError: Story = {
  args: { status: 'error' },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByTestId('convert-button')).toBeEnabled();
  },
};
