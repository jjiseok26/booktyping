import app from './_app.mjs';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
};

export default async function handler(req, res) {
  if (!String(req.url || '').startsWith('/api/teacher-login')) {
    const query = String(req.url || '').includes('?') ? String(req.url).slice(String(req.url).indexOf('?')) : '';
    req.url = `/api/teacher-login${query}`;
  }
  return app(req, res);
}
