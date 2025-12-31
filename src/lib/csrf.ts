import { v4 as uuidv4 } from 'uuid';

import { getSession } from './session';

/**
 * CSRFトークンを生成してセッションに保存
 */
export async function generateCsrfToken(): Promise<string> {
  const session = await getSession();
  const token = uuidv4();

  // セッションにCSRFトークンを保存
  (session as any).csrfToken = token;
  await session.save();

  return token;
}

/**
 * CSRFトークンを検証
 */
export async function verifyCsrfToken(token: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const session = await getSession();
  const sessionToken = (session as any).csrfToken;

  return sessionToken === token;
}

/**
 * リクエストからCSRFトークンを取得
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  return request.headers.get('X-CSRF-Token');
}
