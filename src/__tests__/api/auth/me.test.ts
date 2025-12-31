/**
 * @jest-environment node
 */
import { GET } from '@/app/api/auth/me/route';
import { prisma } from '@/lib/prisma';
import * as sessionModule from '@/lib/session';

// モック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');

describe('GET /api/auth/me', () => {
  const mockSessionUser: sessionModule.SessionData = {
    userId: 1,
    name: '営業太郎',
    email: 'sales@test.com',
    role: 'SALES',
    managerId: 2,
    isLoggedIn: true,
  };

  const mockDatabaseUser = {
    id: 1,
    name: '営業太郎',
    email: 'sales@test.com',
    role: 'SALES' as const,
    managerId: 2,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    manager: {
      name: '上長一郎',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('認証済みユーザーの情報が取得できる (200)', async () => {
      // モックの設定
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDatabaseUser);

      const response = await GET();
      const data = await response.json();

      // ステータスコードの検証
      expect(response.status).toBe(200);

      // レスポンスボディの検証
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 1,
        name: '営業太郎',
        email: 'sales@test.com',
        role: 'sales',
        managerId: 2,
        managerName: '上長一郎',
        createdAt: '2025-01-01T00:00:00.000Z',
      });

      // セッション取得の検証
      expect(sessionModule.getCurrentUser).toHaveBeenCalled();

      // データベース検索の検証
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          createdAt: true,
          manager: {
            select: {
              name: true,
            },
          },
        },
      });
    });

    it('上長が存在しないユーザーの情報が取得できる', async () => {
      const sessionUserWithoutManager = {
        ...mockSessionUser,
        managerId: null,
      };

      const databaseUserWithoutManager = {
        ...mockDatabaseUser,
        managerId: null,
        manager: null,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(sessionUserWithoutManager);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(databaseUserWithoutManager);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.managerId).toBeNull();
      expect(data.data.managerName).toBeNull();
    });

    it('MANAGER役割のユーザー情報が取得できる', async () => {
      const managerSessionUser: sessionModule.SessionData = {
        userId: 2,
        name: '上長一郎',
        email: 'manager@test.com',
        role: 'MANAGER',
        managerId: null,
        isLoggedIn: true,
      };

      const managerDatabaseUser = {
        id: 2,
        name: '上長一郎',
        email: 'manager@test.com',
        role: 'MANAGER' as const,
        managerId: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        manager: null,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(managerSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(managerDatabaseUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('manager');
    });

    it('ADMIN役割のユーザー情報が取得できる', async () => {
      const adminSessionUser: sessionModule.SessionData = {
        userId: 3,
        name: '管理太郎',
        email: 'admin@test.com',
        role: 'ADMIN',
        managerId: null,
        isLoggedIn: true,
      };

      const adminDatabaseUser = {
        id: 3,
        name: '管理太郎',
        email: 'admin@test.com',
        role: 'ADMIN' as const,
        managerId: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        manager: null,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(adminSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(adminDatabaseUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.role).toBe('admin');
    });
  });

  describe('異常系 - 認証エラー', () => {
    it('未認証の場合、401エラー', async () => {
      // セッションが存在しない
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');

      // データベース検索は行われない
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('セッションにユーザーIDが存在するが、DBにユーザーが存在しない場合、404エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toBe('ユーザーが見つかりません');

      // データベース検索は実行される
      expect(prisma.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('異常系 - サーバーエラー', () => {
    it('セッション取得エラーの場合、500エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Session error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('サーバーエラーが発生しました');
    });

    it('データベースエラーの場合、500エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('サーバーエラーが発生しました');
    });
  });

  describe('境界値テスト', () => {
    it('最大長の名前とメールアドレスを持つユーザー情報が取得できる', async () => {
      const longName = 'あ'.repeat(100); // 100文字
      const longEmail = 'a'.repeat(240) + '@test.com'; // 約250文字

      const longSessionUser: sessionModule.SessionData = {
        userId: 1,
        name: longName,
        email: longEmail,
        role: 'SALES',
        managerId: 2,
        isLoggedIn: true,
      };

      const longDatabaseUser = {
        id: 1,
        name: longName,
        email: longEmail,
        role: 'SALES' as const,
        managerId: 2,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        manager: {
          name: '上長一郎',
        },
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(longSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(longDatabaseUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(longName);
      expect(data.data.email).toBe(longEmail);
    });

    it('createdAtが古い日付のユーザー情報が取得できる', async () => {
      const oldDate = new Date('2000-01-01T00:00:00Z');
      const oldUserData = {
        ...mockDatabaseUser,
        createdAt: oldDate,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(oldUserData);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.createdAt).toBe('2000-01-01T00:00:00.000Z');
    });

    it('createdAtが最近の日付のユーザー情報が取得できる', async () => {
      const recentDate = new Date('2025-12-31T23:59:59.999Z');
      const recentUserData = {
        ...mockDatabaseUser,
        createdAt: recentDate,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(recentUserData);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.createdAt).toBe('2025-12-31T23:59:59.999Z');
    });
  });

  describe('エッジケース', () => {
    it('セッションのisLoggedInがfalseの場合、未認証として扱われる', async () => {
      const loggedOutSessionUser: sessionModule.SessionData = {
        ...mockSessionUser,
        isLoggedIn: false,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(null); // getCurrentUser内でisLoggedInがfalseの場合nullを返す

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('上長名が非常に長い場合でも正常に取得できる', async () => {
      const longManagerName = 'あ'.repeat(100);
      const userWithLongManagerName = {
        ...mockDatabaseUser,
        manager: {
          name: longManagerName,
        },
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithLongManagerName);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.managerName).toBe(longManagerName);
    });

    it('特殊文字を含むユーザー名が正常に取得できる', async () => {
      const specialName = "O'Neil <script>alert('xss')</script>";
      const userWithSpecialName = {
        ...mockDatabaseUser,
        name: specialName,
      };

      const sessionWithSpecialName = {
        ...mockSessionUser,
        name: specialName,
      };

      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(sessionWithSpecialName);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithSpecialName);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(specialName);
    });
  });

  describe('レスポンス形式の検証', () => {
    it('レスポンスが正しいJSON形式である', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDatabaseUser);

      const response = await GET();
      const contentType = response.headers.get('content-type');

      expect(contentType).toContain('application/json');
    });

    it('成功レスポンスに必須フィールドが全て含まれている', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSessionUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDatabaseUser);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('email');
      expect(data.data).toHaveProperty('role');
      expect(data.data).toHaveProperty('managerId');
      expect(data.data).toHaveProperty('managerName');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('エラーレスポンスに必須フィールドが全て含まれている', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });

    it('roleが小文字に変換されている', async () => {
      const roles = ['SALES', 'MANAGER', 'ADMIN'] as const;

      for (const role of roles) {
        const sessionUser: sessionModule.SessionData = {
          userId: 1,
          name: 'テストユーザー',
          email: 'test@test.com',
          role: role,
          managerId: null,
          isLoggedIn: true,
        };

        const dbUser = {
          id: 1,
          name: 'テストユーザー',
          email: 'test@test.com',
          role: role,
          managerId: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          manager: null,
        };

        (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(sessionUser);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

        const response = await GET();
        const data = await response.json();

        expect(data.data.role).toBe(role.toLowerCase());
      }
    });
  });
});
