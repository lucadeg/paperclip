'use strict';
/**
 * MVX FOS PM - controlled static UI adapter for the Paperclip project.
 * This is NOT the Paperclip API and never asserts backend or agent readiness.
 * Only the static UI is served. Fork's original MIT license is retained.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = Number(process.env.PAPERCLIP_UI_PORT || 3112);
if (!Number.isSafeInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error('Invalid PAPERCLIP_UI_PORT');
}
const HOST = '127.0.0.1';
const DIST_DIR = path.resolve(__dirname, 'ui', 'dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json'
};
function isUnderDirectory(file) {
  const rel = path.relative(DIST_DIR, file);
  return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}
function reject(res, code, message) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(message);
}
const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // The UI is designed to be embedded by local Founder OS only.
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://127.0.0.1:5173 http://localhost:5173");
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    reject(res, 405, 'Method not allowed'); return;
  }
  let url, decoded;
  try {
    url = new URL(req.url || '/', 'http://127.0.0.1:' + PORT);
    decoded = decodeURIComponent(url.pathname);
  } catch {
    reject(res, 400, 'Invalid request path'); return;
  }
  if (url.pathname === '/api/status') {
    const payload = JSON.stringify({
      status: 'ONLINE',
      service: 'Paperclip Real Production UI',
      product: 'MVX FOS PM',
      port: PORT,
      backendAuthorized: false
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? '' : payload);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    reject(res, 404, 'Paperclip API not served by this UI process'); return;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) {
    reject(res, 400, 'Invalid path'); return;
  }
  let filePath = path.resolve(DIST_DIR, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded));
  if (!isUnderDirectory(filePath)) {
    reject(res, 403, 'Outside document root'); return;
  }
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      if (path.extname(decoded) || !/(text\/html|\*\/\*)/i.test(req.headers.accept || '')) {
        reject(res, 404, 'Resource not found'); return;
      }
      filePath = path.join(DIST_DIR, 'index.html');
    }
    // Also reject symlinks that resolve outside ui/dist.
    if (!isUnderDirectory(fs.realpathSync(filePath))) {
      reject(res, 403, 'Outside document root'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    let data = fs.readFileSync(filePath);
    if (PORT === 3112 && ext === '.html' && path.basename(filePath) === 'index.html') {
      const html = data.toString('utf8')
        .replace(/<title>[^<]*<\/title>/i, '<title>MVX FOS PM | Paperclip</title>')
        .replace(/<meta name="apple-mobile-web-app-title" content="[^"]*"\s*\/>/i,
          '<meta name="apple-mobile-web-app-title" content="MVX FOS PM" />');
      data = Buffer.from(html, 'utf8');
    }
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? '' : data);
  } catch (error) {
    if (error && error.code === 'ENOENT') reject(res, 404, 'Resource not found');
    else reject(res, 500, 'Static file unavailable');
  }
});
server.on('error', error => {
  console.error('MVX FOS PM UI startup failed:', error.message);
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log('MVX FOS PM static UI listening on http://' + HOST + ':' + PORT);
});
