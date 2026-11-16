const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const userMode = process.argv.includes('--user');
const root = userMode ? path.resolve(__dirname, '..') : path.resolve(__dirname, '../prototype/dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  let file;
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (userMode && pathname === '/') { response.writeHead(302, { Location: '/user/index.html' }); response.end(); return; }
    if (userMode && !/^\/(user\/|prototype\/dist\/)/.test(pathname)) { response.writeHead(404); response.end(); return; }
    file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  } catch { response.writeHead(400); response.end('Invalid URL'); return; }
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (userMode && ![path.join(root, 'user') + path.sep, path.join(root, 'prototype/dist') + path.sep].some(allowed => file.startsWith(allowed))) { response.writeHead(403); response.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = fs.createReadStream(file); stream.on('error', () => response.destroy()); stream.pipe(response);
  });
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(userMode ? 4174 : 4173, '127.0.0.1', () => console.log(userMode ? 'HAVE: http://127.0.0.1:4174/' : 'HumanProof: http://127.0.0.1:4173/'));

