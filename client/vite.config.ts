import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, createLogger} from 'vite';

export default defineConfig(() => {
  const customLogger = createLogger();
  const loggerError = customLogger.error;
  
  customLogger.error = (msg, options) => {
    // Ignore proxy socket errors
    if (msg.includes('proxy error') && (msg.includes('ECONN') || msg.includes('ECONNABORTED'))) {
      return;
    }
    loggerError(msg, options);
  };

  return {
    customLogger,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
          configure: (proxy, _options) => {
            // Remove the default error listener added by Vite to suppress its logs
            proxy.removeAllListeners('error');
            
            proxy.on('error', (err, _req, res) => {
              if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED'].includes((err as any).code)) {
                // If it's an HTTP request, gracefully end it
                if (res && typeof (res as any).writeHead === 'function' && !(res as any).headersSent) {
                  (res as any).writeHead(502);
                  (res as any).end();
                }
                return;
              }
              console.log('Socket.IO proxy error:', err.message);
            });
            
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              socket.on('error', (err: any) => {
                if (['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED'].includes(err.code)) return;
              });
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
