import app from './_app.mjs';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString('utf8');
      req.body = raw ? JSON.parse(raw) : {};
    } else if (typeof req.body === 'string') {
      req.body = req.body ? JSON.parse(req.body) : {};
    }
  } catch {
    req.body = {};
  }
  return app(req, res);
}
