import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = Number(process.env.CAPTUREIT_FIXTURE_PORT || 4173);
const root = resolve(fileURLToPath(new URL('../fixtures/order-demo/', import.meta.url)));
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolutePath = resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) return null;
  return absolutePath;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }
  const filePath = resolveRequestPath(request.url || '/');
  try {
    if (!filePath || !(await stat(filePath)).isFile()) throw new Error('Not found');
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(filePath)) || 'application/octet-stream',
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`CaptureIT fixture: http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
