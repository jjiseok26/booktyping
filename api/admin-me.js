import { readStaffToken } from '../server/adminAuth.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'GET만 지원합니다.' });
    return;
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const staff = readStaffToken(token);
  if (!staff) {
    res.status(401).json({ success: false, message: '관리자 로그인이 필요합니다.' });
    return;
  }

  res.status(200).json({
    success: true,
    admin: {
      id: staff.role === 'admin' ? 'admin-default' : `teacher:${staff.username}`,
      username: staff.username,
      role: staff.role,
      schoolName: staff.schoolName,
      grade: Number(staff.grade || 0),
      classNum: Number(staff.classNum || 0),
    },
  });
}
