'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { buildProject } = require('./build');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const LIVERELOAD_SNIPPET =
  '<script>new EventSource("/__livereload").onmessage=function(){location.reload()}</script>';

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function startServer(config, { log = console.log } = {}) {
  const clients = new Set();
  let building = false;
  let pending = false;

  function rebuild(reason) {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    try {
      buildProject(config);
      log(`✦ rebuilt${reason ? ` (${reason})` : ''}`);
      for (const res of clients) res.write('data: reload\n\n');
    } catch (err) {
      log(`✗ build failed: ${err.message}`);
    } finally {
      building = false;
      if (pending) {
        pending = false;
        setTimeout(() => rebuild('queued change'), 50);
      }
    }
  }

  rebuild();

  // Watch the source and theme directories (plus the built-in theme, so
  // theme development gets live reload too); debounce bursts of events.
  let timer = null;
  const defaultTheme = path.join(__dirname, '..', 'themes', 'default');
  const watchDirs = [config.source, config.theme, defaultTheme].filter((dir) =>
    fs.existsSync(dir)
  );
  const watchers = watchDirs.map((dir) =>
    fs.watch(dir, { recursive: true }, (event, filename) => {
      clearTimeout(timer);
      timer = setTimeout(() => rebuild(filename || event), 120);
    })
  );

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/__livereload')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    let filePath = safeJoin(config.out, req.url === '/' ? '/index.html' : req.url);
    if (!filePath) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (ext === '.html') {
      // Inject livereload at serve time so the built artifact stays clean.
      const html = fs.readFileSync(filePath, 'utf8');
      res.end(html.replace('</body>', `${LIVERELOAD_SNIPPET}</body>`));
    } else {
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.listen(config.port, () => {
    log(`\n  veridocs dev server`);
    log(`  ➜  http://localhost:${config.port}`);
    log(`  watching ${watchDirs.map((d) => path.relative(process.cwd(), d) || '.').join(', ')}\n`);
  });

  return {
    server,
    close() {
      for (const watcher of watchers) watcher.close();
      for (const res of clients) res.end();
      server.close();
    },
  };
}

module.exports = { startServer };
