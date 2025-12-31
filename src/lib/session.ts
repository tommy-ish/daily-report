import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

/**
 * セッションデータの型定義
 */
export interface SessionData {
  userId: number;
  name: string;
  email: string;
  role: 'SALES' | 'MANAGER' | 'ADMIN';
  managerId: number | null;
  isLoggedIn: boolean;
}

/**
 * セッション設定
 */
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'daily-report-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 60, // 30分
    path: '/',
  },
};

/**
 * セッションを取得
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * セッションを作成
 */
export async function createSession(userData: Omit<SessionData, 'isLoggedIn'>): Promise<void> {
  const session = await getSession();
  session.userId = userData.userId;
  session.name = userData.name;
  session.email = userData.email;
  session.role = userData.role;
  session.managerId = userData.managerId;
  session.isLoggedIn = true;
  await session.save();
}

/**
 * セッションを削除
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * セッションから現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return null;
  }
  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    managerId: session.managerId,
    isLoggedIn: session.isLoggedIn,
  };
}
