import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy Pinterest OAuth token exchange to avoid CORS issues
      '/api/pinterest-oauth': {
        target: 'https://www.pinterest.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pinterest-oauth/, '/oauth/token'),
        secure: true,
      },
      // Proxy Pinterest API v5 to avoid CORS issues
      '/api/pinterest-api': {
        target: 'https://api.pinterest.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pinterest-api/, '/v5'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward the Authorization header from the original request
            const authHeader = req.headers.authorization;
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
            }
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        },
        secure: true,
      },
      // Proxy Pinterest images to avoid CORS issues
      '/api/pinterest-image': {
        target: 'https://i.pinimg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pinterest-image/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Set CORS headers for image responses
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type';
          });
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
