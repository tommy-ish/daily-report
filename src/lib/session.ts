import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

import type { SessionData, SessionOptions } from '@/types/session';

/**
 * セッションタイムアウト時間 (30分)
 */
export const SESSION_TIMEOUT = 30 * 60; // 30分 (秒単位)

/**
 * SESSION_SECRET環境変数の最小長
 */
const SESSION_SECRET_MIN_LENGTH = 32;

/**
 * SESSION_SECRET環境変数を検証する
 *
 * @throws {Error} SESSION_SECRETが設定されていない、または短すぎる場合
 */
function validateSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. ' +
        'Please set a strong random string (at least 32 characters) in your .env file. ' +
        'You can generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (sessionSecret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters long. ` +
        `Current length: ${sessionSecret.length}. ` +
        'You can generate a strong secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return sessionSecret;
}

/**
 * セッション設定
 */
export const sessionOptions: SessionOptions = {
  cookieName: 'daily-report-session',
  password: validateSessionSecret(),
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT,
    path: '/',
  },
};

/**
 * セッションを取得する
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  return session;
}

/**
 * ユーザーがログインしているか確認する
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}

/**
 * セッションのタイムアウトをチェックする
 */
export async function checkSessionTimeout(): Promise<boolean> {
  const session = await getSession();

  if (!session.userId || !session.lastActivity) {
    return false;
  }

  const now = Date.now();
  const timeSinceLastActivity = (now - session.lastActivity) / 1000; // 秒単位

  // セッションタイムアウトを超えている場合
  if (timeSinceLastActivity > SESSION_TIMEOUT) {
    await destroySession();
    return false;
  }

  // 最終アクティビティ時刻を更新
  session.lastActivity = now;
  await session.save();

  return true;
}

/**
 * セッションを作成する
 */
export async function createSession(userData: {
  userId: number;
  name: string;
  email: string;
  role: 'sales' | 'manager' | 'admin';
  managerId?: number | null;
}): Promise<void> {
  const session = await getSession();
  const now = Date.now();

  session.userId = userData.userId;
  session.name = userData.name;
  session.email = userData.email;
  session.role = userData.role;
  session.managerId = userData.managerId;
  session.createdAt = now;
  session.lastActivity = now;

  await session.save();
}

/**
 * セッションを破棄する
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * 現在ログインしているユーザー情報を取得する
 */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session.userId) {
    return null;
  }

  // セッションタイムアウトをチェック
  const isValid = await checkSessionTimeout();
  if (!isValid) {
    return null;
  }

  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    managerId: session.managerId,
    createdAt: session.createdAt,
    csrfToken: session.csrfToken,
    lastActivity: session.lastActivity,
  };
}

/**
 * ユーザーが特定の役割を持っているか確認する
 */
export async function hasRole(role: 'sales' | 'manager' | 'admin'): Promise<boolean> {
  const session = await getSession();
  return session.role === role;
}

/**
 * ユーザーが管理者または上長であるか確認する
 */
export async function isManagerOrAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.role === 'manager' || session.role === 'admin';
}
