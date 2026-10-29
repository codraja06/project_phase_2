// Read-only, loopback-only hosting for the exported audit build. No backend or secrets served.
const http = require('http'), fs = require('fs'), path = require('path');
const exportParent = path.resolve(__dirname, '../../.expo');
const root = path.resolve(exportParent, process.env.AUDIT_EXPORT_DIRECTORY || 'audit-20261025');
if (!root.startsWith(exportParent + path.sep)) throw new Error('Serve only a dedicated exported build inside mobile/.expo');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
http.createServer((request, response) => {
  try {
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (request.method === 'HEAD') { response.writeHead(200, headers).end(); return; }
  const stream = fs.createReadStream(file);
  stream.on('error', () => { if (!response.headersSent) response.writeHead(503).end(); else response.destroy(); });
  stream.on('open', () => { response.writeHead(200, headers); stream.pipe(response); });
  } catch { response.writeHead(503).end(); }
}).listen(8083, '127.0.0.1', () => console.log('Read-only exported audit preview on http://127.0.0.1:8083'));
