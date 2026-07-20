import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// RTL's automatic afterEach cleanup only self-registers when it can see a
// global `afterEach` (i.e. with vitest's `globals: true`). This project
// imports test globals explicitly instead, so wire cleanup up by hand.
afterEach(() => {
  cleanup();
});
