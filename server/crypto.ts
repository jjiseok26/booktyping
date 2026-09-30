import { createCipheriv, createDecipheriv, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const PREFIX = 'enc1$';

function dataKey(): Buffer {
  const secret = String(
    process.env.DATA_ENCRYPTION_KEY ||
      process.env.ADMIN_TOKEN_SECRET ||
      process.env.ADMIN_PASSWORD ||
      'booktyping-at-rest-key'
  );
  return createHash('sha256').update(secret).digest();
}

export function isSealed(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function seal(value: string): string {
  if (isSealed(value)) return value;
  const key = dataKey();
  const iv = createHmac('sha256', key).update(value).digest().subarray(0, 16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = createHmac('sha256', key).update(Buffer.concat([iv, encrypted])).digest().subarray(0, 16);
  return PREFIX + Buffer.concat([tag, iv, encrypted]).toString('base64url');
}

export function open(value: string): string {
  if (!isSealed(value)) return value;
  try {
    const key = dataKey();
    const packed = Buffer.from(value.slice(PREFIX.length), 'base64url');
    const tag = packed.subarray(0, 16);
    const iv = packed.subarray(16, 32);
    const encrypted = packed.subarray(32);
    const expected = createHmac('sha256', key).update(Buffer.concat([iv, encrypted])).digest().subarray(0, 16);
    if (tag.length !== expected.length || !timingSafeEqual(tag, expected)) {
      return value;
    }
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return value;
  }
}

export function sealValue(value: unknown): unknown {
  return typeof value === 'string' ? seal(value) : value;
}

export function openRow<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === 'string') {
      (next as Record<string, unknown>)[key] = open(value);
    }
  }
  return next;
}
