import http from 'http';
import url from 'url';
import { default as handler } from './api/index.ts';
import dotenv from 'dotenv';

dotenv.config();

// Prevenir queda por EPIPE (Broken Pipe) se os streams de console forem fechados no background pela IDE
process.stdout.on('error', () => {});
process.stderr.on('error', () => {});

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  console.log(`[API] ${req.method} ${req.url}`);
  
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'];
  const origin = req.headers['origin'];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      if (body && req.headers['content-type']?.includes('application/json')) {
        req.body = JSON.parse(body);
      } else {
        req.body = {};
      }

      const parsedUrl = url.parse(req.url || '', true);
      req.query = parsedUrl.query;

      const vRes = {
        status: (code) => {
          res.statusCode = code;
          return vRes;
        },
        json: (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return vRes;
        },
        end: (msg) => {
          res.end(msg);
          return vRes;
        },
        setHeader: (name, value) => {
          res.setHeader(name, value);
          return vRes;
        }
      };

      await handler(req, vRes);
    } catch (err) {
      console.error('[API ERROR]', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Local API Server running at http://localhost:${PORT}`);
});
