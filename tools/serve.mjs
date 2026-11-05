// Server statis untuk demo lokal. Tidak menerima unggahan foto.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const qaRoot = path.resolve(fileURLToPath(new URL('../.qa/', import.meta.url)));
const qa = process.argv.includes('--qa');
const port = Number(process.env.PORT || 5173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const isQa = qa && pathname.startsWith('/__qa/');
    const base = isQa ? qaRoot : root;
    const relative = isQa ? '/' + pathname.slice(6) : pathname;
    const file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
    if (!file.startsWith(base + path.sep) || !['GET','HEAD'].includes(req.method)) {
      res.writeHead(403).end(); return;
    }
    const size = (await stat(file)).size;
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch { res.writeHead(404).end('File tidak ditemukan.'); }
}).listen(port, '127.0.0.1', () => console.log(`D-Fire: http://127.0.0.1:${port}${qa ? ' (QA lokal aktif)' : ''}`));
