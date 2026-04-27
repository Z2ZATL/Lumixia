import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) {
            return 'react';
          }

          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }

          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }

          return undefined;
        },
      },
    },
  },
});
