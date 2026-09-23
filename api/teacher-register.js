import handler, { config } from './_handler.js';

export { config };

export default async function teacherRegister(req, res) {
  if (!String(req.url || '').startsWith('/api/teacher-register')) {
    const query = String(req.url || '').includes('?') ? String(req.url).slice(String(req.url).indexOf('?')) : '';
    req.url = `/api/teacher-register${query}`;
  }
  return handler(req, res);
}
