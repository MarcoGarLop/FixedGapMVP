import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    open: true,
    // Fixed, stable origin so localStorage (Alpha's session history) persists
    // across days. 'host:true' + a shifting port would change the origin and
    // make previous sessions "disappear".
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: 'oxc',
  },
  plugins: [
    {
      name: 'serve-dashboard',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/dashboard')) {
            const urlPath = req.url.replace(/\?.*$/, '');
            const filePath = path.join(process.cwd(), 'public', urlPath);

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              return next();
            }

            const indexPath = path.join(process.cwd(), 'public', 'dashboard', 'index.html');
            res.setHeader('Content-Type', 'text/html');
            res.end(fs.readFileSync(indexPath, 'utf-8'));
            return;
          }
          next();
        });
      },
    },
  ],
});
