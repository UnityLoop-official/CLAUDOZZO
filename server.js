const http = require('http');
const fs = require('fs');
const path = require('path');

// Carica .env manualmente (senza dipendenze)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.+)?\s*$/);
    if (match && !line.startsWith('#')) {
      process.env[match[1]] = (match[2] || '').trim();
    }
  });
}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint: POST /api/chat
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no_api_key', message: 'API key non configurata. Usa fakeReply.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { message, vibe, system } = JSON.parse(body);

        // Chiama Claude API
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: system,
          messages: [{ role: 'user', content: message }]
        });

        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          }
        };

        const https = require('https');
        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', chunk => { data += chunk; });
          apiRes.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.content && result.content[0]) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: result.content[0].text }));
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'api_error', message: data }));
              }
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'parse_error', message: e.message }));
            }
          });
        });

        apiReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'network_error', message: e.message }));
        });

        apiReq.write(payload);
        apiReq.end();

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad_request', message: e.message }));
      }
    });
    return;
  }

  // API status: GET /api/status
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      api_configured: !!API_KEY,
      mode: API_KEY ? 'live' : 'fake'
    }));
    return;
  }

  // Static file server
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath.split('?')[0]);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const hasKey = API_KEY ? 'ATTIVA' : 'NON CONFIGURATA (usa fakeReply)';
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   CLAUDOZZO - Server Locale              ║
  ╠══════════════════════════════════════════╣
  ║   http://localhost:${PORT}                  ║
  ║   API Claude: ${hasKey.padEnd(27)}║
  ╚══════════════════════════════════════════╝
  `);
});
