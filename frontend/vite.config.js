import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0) so other computers on the LAN can connect
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('agora-rtc-sdk-ng')) {
            return 'agora-rtc';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        }
      }
    }
  }
});
