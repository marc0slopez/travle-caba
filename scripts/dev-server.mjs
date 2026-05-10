import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const preferredPort = Number(process.env.PORT || 4173);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.geojson', 'application/geo+json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon']
]);

function safeResolve(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const resolved = path.resolve(root, '.' + requested);
  return resolved.startsWith(root) ? resolved : null;
}

const server = http.createServer(async (req, res) => {
  const target = safeResolve(req.url || '/');
  if (!target) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const body = await fs.readFile(target);
    res.writeHead(200, {
      'Content-Type': mimeTypes.get(path.extname(target).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < preferredPort + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, () => {
    console.log('Travle CABA listo en http://localhost:' + port);
  });
}

listen(preferredPort);
