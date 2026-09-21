import app from './_app.mjs';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
  api: {
    bodyParser: false,
  },
};

function isParsedObject(body) {
  return Boolean(body && typeof body === 'object' && !Buffer.isBuffer(body) && Object.keys(body).length > 0);
}

async function readJsonBody(req) {
  if (isParsedObject(req.body)) return req.body;
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    const raw = String(req.body || '').trim();
    return raw ? JSON.parse(raw) : {};
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    try {
      req.body = await readJsonBody(req);
    } catch {
      req.body = {};
    }
  }
  return app(req, res);
}
