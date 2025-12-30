/**
 * セッション管理機能のテスト
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// モック設定
const mockGetIronSession = jest.fn();
const mockCookies = jest.fn();

jest.mock('iron-session', () => ({
  getIronSession: mockGetIronSession,
}));

jest.mock('next/headers', () => ({
  cookies: mockCookies,
}));

// テスト対象のインポート（モックの後）
import {
  SESSION_TIMEOUT,
  isAuthenticated,
  createSession,
  destroySession,
  getCurrentUser,
  checkSessionTimeout,
} from '@/lib/session';

describe('Session Management', () => {
  let mockSession: any;

  beforeEach(() => {
    // セッションモックのリセット
    mockSession = {
      userId: undefined,
      name: undefined,
      email: undefined,
      role: undefined,
      managerId: undefined,
      createdAt: undefined,
      csrfToken: undefined,
      lastActivity: undefined,
      save: jest.fn(),
      destroy: jest.fn(),
    };

    mockGetIronSession.mockResolvedValue(mockSession);
    mockCookies.mockResolvedValue({});
    jest.clearAllMocks();
  });

  describe('SESSION_TIMEOUT', () => {
    it('should be 30 minutes in seconds', () => {
      expect(SESSION_TIMEOUT).toBe(30 * 60);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in', async () => {
      mockSession.userId = 1;
      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when user is not logged in', async () => {
      mockSession.userId = undefined;
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should create session with user data', async () => {
      const userData = {
        userId: 1,
        name: '山田太郎',
        email: 'yamada@example.com',
        role: 'sales' as const,
        managerId: 2,
      };

      await createSession(userData);

      expect(mockSession.userId).toBe(1);
      expect(mockSession.name).toBe('山田太郎');
      expect(mockSession.email).toBe('yamada@example.com');
      expect(mockSession.role).toBe('sales');
      expect(mockSession.managerId).toBe(2);
      expect(mockSession.createdAt).toBeDefined();
      expect(mockSession.lastActivity).toBeDefined();
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });

    it('should create session without managerId', async () => {
      const userData = {
        userId: 2,
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        role: 'manager' as const,
      };

      await createSession(userData);

      expect(mockSession.userId).toBe(2);
      expect(mockSession.managerId).toBeUndefined();
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroySession', () => {
    it('should destroy the session', async () => {
      await destroySession();
      expect(mockSession.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data when logged in and session is valid', async () => {
      const now = Date.now();
      mockSession.userId = 1;
      mockSession.name = '山田太郎';
      mockSession.email = 'yamada@example.com';
      mockSession.role = 'sales';
      mockSession.managerId = 2;
      mockSession.createdAt = now;
      mockSession.lastActivity = now;
      mockSession.csrfToken = 'test-token';

      const user = await getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.userId).toBe(1);
      expect(user?.name).toBe('山田太郎');
      expect(user?.email).toBe('yamada@example.com');
      expect(user?.role).toBe('sales');
      expect(user?.managerId).toBe(2);
    });

    it('should return null when not logged in', async () => {
      mockSession.userId = undefined;
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return null when session is timed out', async () => {
      const now = Date.now();
      const oldTime = now - (SESSION_TIMEOUT + 100) * 1000; // タイムアウトより古い時刻

      mockSession.userId = 1;
      mockSession.lastActivity = oldTime;

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(mockSession.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkSessionTimeout', () => {
    it('should return true and update lastActivity when session is valid', async () => {
      const now = Date.now();
      mockSession.userId = 1;
      mockSession.lastActivity = now - 1000; // 1秒前

      const result = await checkSessionTimeout();

      expect(result).toBe(true);
      expect(mockSession.lastActivity).toBeGreaterThan(now - 1000);
      expect(mockSession.save).toHaveBeenCalledTimes(1);
    });

    it('should return false when userId is not set', async () => {
      mockSession.userId = undefined;
      const result = await checkSessionTimeout();
      expect(result).toBe(false);
    });

    it('should return false when lastActivity is not set', async () => {
      mockSession.userId = 1;
      mockSession.lastActivity = undefined;
      const result = await checkSessionTimeout();
      expect(result).toBe(false);
    });

    it('should return false and destroy session when timed out', async () => {
      const now = Date.now();
      const oldTime = now - (SESSION_TIMEOUT + 100) * 1000;

      mockSession.userId = 1;
      mockSession.lastActivity = oldTime;

      const result = await checkSessionTimeout();

      expect(result).toBe(false);
      expect(mockSession.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
