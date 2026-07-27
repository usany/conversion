import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeFile } from '@/tests/test-utils';
import { PreviewArea } from './PreviewArea';

describe('PreviewArea', () => {
  it('shows a placeholder and no rendered markdown when no file is selected', () => {
    const { container } = render(<PreviewArea file={null} />);

    expect(screen.getByTestId('preview-area')).toBeInTheDocument();
    expect(screen.getByText(/select a file to preview/i)).toBeInTheDocument();
    expect(container.querySelector('h1')).toBeNull();
  });

  it('renders markdown as real elements, not escaped text', () => {
    const file = makeFile({
      content: '# Report Title\n\n- alpha\n- beta\n\n**bold**',
    });

    render(<PreviewArea file={file} />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Report Title' });
    expect(heading).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['alpha', 'beta']);

    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('renders fenced code blocks as pre > code', () => {
    const file = makeFile({ content: '```js\nconst a = 1;\n```' });

    const { container } = render(<PreviewArea file={file} />);

    const code = container.querySelector('pre > code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toContain('const a = 1;');
  });

  it('strips script tags and inline event handlers from file content', () => {
    const file = makeFile({
      content: [
        '# Safe',
        '',
        '<script>window.__pwned = true;</script>',
        '',
        '<img src="x" onerror="window.__pwned = true">',
        '',
        '[click](javascript:window.__pwned=true)',
      ].join('\n'),
    });

    const { container } = render(<PreviewArea file={file} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toContain('javascript:');
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();

    // The safe part still renders.
    expect(screen.getByRole('heading', { name: 'Safe' })).toBeInTheDocument();
  });

  it('swaps the rendered content when the file prop changes', () => {
    const first = makeFile({ content: '# First Document' });
    const second = makeFile({ content: '# Second Document' });

    const { rerender } = render(<PreviewArea file={first} />);
    expect(screen.getByRole('heading', { name: 'First Document' })).toBeInTheDocument();

    rerender(<PreviewArea file={second} />);
    expect(screen.queryByRole('heading', { name: 'First Document' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second Document' })).toBeInTheDocument();

    rerender(<PreviewArea file={null} />);
    expect(screen.getByText(/select a file to preview/i)).toBeInTheDocument();
  });

  it('preserves Korean text intact', () => {
    const file = makeFile({ content: '# 문서 제목\n\n본문 내용입니다.' });

    render(<PreviewArea file={file} />);

    expect(screen.getByRole('heading', { name: '문서 제목' })).toBeInTheDocument();
    expect(screen.getByText('본문 내용입니다.')).toBeInTheDocument();
  });
});
