import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [], set: vi.fn(), get: vi.fn() }),
  headers: () => ({ get: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomBytes: vi.fn(() => Buffer.from('test')),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => Buffer.from('test')),
    })),
  },
});