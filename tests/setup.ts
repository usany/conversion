import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom does not implement ResizeObserver, which @dnd-kit measures with on mount.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom does not implement the object-URL APIs the PDF download path uses.
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!globalThis.crypto?.randomUUID) {
  let seq = 0;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      ...globalThis.crypto,
      randomUUID: () => `uuid-${++seq}`,
    },
  });
}
