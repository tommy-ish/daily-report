import { v4 as uuidv4 } from 'uuid';
import { getSession } from './session';

/**
 * CSRFトークンを生成してセッションに保存する
 */
export async function generateCsrfToken(): Promise<string> {
  const session = await getSession();

  // 既にトークンが存在する場合はそれを返す
  if (session.csrfToken) {
    return session.csrfToken;
  }

  // 新しいトークンを生成
  const token = uuidv4();
  session.csrfToken = token;
  await session.save();

  return token;
}

/**
 * CSRFトークンを検証する
 */
export async function verifyCsrfToken(token: string | null | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const session = await getSession();

  // セッションにトークンが保存されていない場合
  if (!session.csrfToken) {
    return false;
  }

  // トークンが一致するか確認
  return session.csrfToken === token;
}

/**
 * CSRFトークンをリセットする (ログアウト時などに使用)
 */
export async function resetCsrfToken(): Promise<void> {
  const session = await getSession();
  session.csrfToken = undefined;
  await session.save();
}

/**
 * リクエストヘッダーからCSRFトークンを取得する
 */
export function getCsrfTokenFromHeaders(headers: Headers): string | null {
  return headers.get('x-csrf-token');
}

/**
 * HTTPメソッドがCSRF保護が必要かどうかを判定する
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}
