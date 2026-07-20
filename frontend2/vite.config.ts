import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    port: 3001,
    host: 'localhost',
  },
  test: {
    include: ['src/__smoke__/**/*.test.ts', 'src/__smoke__/**/*.test.tsx'],
    environment: 'node',
    environmentMatchGlobs: [['src/__smoke__/**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/__smoke__/setupTests.ts'],
  },
} as UserConfig;
