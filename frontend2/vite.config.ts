import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    port: 3001,
    host: 'localhost',
  },
  test: {
    include: ['src/__smoke__/**/*.test.ts'],
    environment: 'node',
  },
} as UserConfig;
