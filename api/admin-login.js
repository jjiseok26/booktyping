import {
  expectedAdminPassword,
  expectedAdminUser,
  secretsEqual,
  signStaffToken,
} from '../server/adminAuth.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
};

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {};
  }
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8');
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
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'POST만 지원합니다.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
      res.status(401).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
      return;
    }
    if (!secretsEqual(username, expectedAdminUser()) || !secretsEqual(password, expectedAdminPassword())) {
      res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const token = signStaffToken({ u: expectedAdminUser(), role: 'admin' });
    res.status(200).json({
      success: true,
      message: '관리자로 로그인되었습니다.',
      token,
      role: 'admin',
      admin: {
        id: 'admin-default',
        username: expectedAdminUser(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '관리자 로그인에 실패했습니다.',
    });
  }
}
