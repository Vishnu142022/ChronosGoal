import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const BACKEND_ORIGIN = 'http://127.0.0.1:8080';
const BACKEND_CONTEXT_PATH = '/discipline-os-backend';

app.use(
  createProxyMiddleware({
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    secure: false,
    pathFilter: (path) => path === '/api' || path.startsWith('/api/'),
    pathRewrite: (path) =>
      path.replace(
        /^\/api(?=\/|$)/,
        `${BACKEND_CONTEXT_PATH}/api`
      ),
    cookiePathRewrite: '/',
    on: {
      proxyReq: (_proxyReq, req) => {
        console.log(`[PROXY] ${req.method} ${req.url}`);
      },
      proxyRes: (proxyRes, req) => {
        console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} ${req.url}`);
      },
      error: (err, req) => {
        console.error(
          `[PROXY ERROR] ${req.method} ${req.url}: ${err.message}`
        );
      },
    },
  })
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err: unknown) => {
  console.error('Failed to start frontend server:', err);
  process.exitCode = 1;
});

