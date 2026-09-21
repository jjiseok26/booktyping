import handler, { config } from './_handler.js';

export { config };

export default async function teacherLogin(req, res) {
  if (!String(req.url || '').startsWith('/api/teacher-login')) {
    const query = String(req.url || '').includes('?') ? String(req.url).slice(String(req.url).indexOf('?')) : '';
    req.url = `/api/teacher-login${query}`;
  }
  return handler(req, res);
}
