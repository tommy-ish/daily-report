/**
 * @jest-environment node
 */
import bcrypt from 'bcrypt';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';
import * as csrfModule from '@/lib/csrf';
import { prisma } from '@/lib/prisma';
import * as rateLimitModule from '@/lib/rate-limit';
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
jest.mock('@/lib/csrf');
jest.mock('@/lib/rate-limit');
jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('POST /api/auth/login', () => {
  const mockUser = {
    id: 1,
    name: '営業太郎',
    email: 'sales@test.com',
    password: '$2b$10$hashedpassword',
    role: 'SALES' as const,
    managerId: 2,
    manager: {
      name: '上長一郎',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトでレート制限をパス
    (rateLimitModule.getIpFromRequest as jest.Mock).mockReturnValue('127.0.0.1');
    (rateLimitModule.checkLoginRateLimit as jest.Mock).mockReturnValue(true);
    // デフォルトでCSRFトークン生成
    (csrfModule.generateCsrfToken as jest.Mock).mockResolvedValue('csrf-token-123');
  });

  describe('正常系', () => {
    it('正しい認証情報でログイン成功 (200)', async () => {
      // モックの設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // ステータスコードの検証
      expect(response.status).toBe(200);

      // レスポンスボディの検証
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual({
        id: 1,
        name: '営業太郎',
        email: 'sales@test.com',
        role: 'SALES',
        managerId: 2,
        managerName: '上長一郎',
      });
      expect(data.data.csrfToken).toBe('csrf-token-123');
      expect(data.data.sessionExpiry).toBeDefined();

      // セッション作成の検証
      expect(sessionModule.createSession).toHaveBeenCalledWith({
        userId: 1,
        name: '営業太郎',
        email: 'sales@test.com',
        role: 'SALES',
        managerId: 2,
      });

      // CSRFトークン生成の検証
      expect(csrfModule.generateCsrfToken).toHaveBeenCalled();
    });

    it('上長が存在しないユーザーでもログイン成功', async () => {
      const userWithoutManager = {
        ...mockUser,
        managerId: null,
        manager: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithoutManager);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'manager@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user.managerId).toBeNull();
      expect(data.data.user.managerName).toBeNull();
    });
  });

  describe('異常系 - バリデーションエラー', () => {
    it('メールアドレスが空の場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('入力値が不正です');
      expect(data.error.details).toBeDefined();
    });

    it('メールアドレスの形式が不正な場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('パスワードが空の場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('リクエストボディが不正な場合、エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          // passwordフィールドが欠落
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('異常系 - 認証エラー', () => {
    it('存在しないメールアドレスの場合、401エラー', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'notfound@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('メールアドレスまたはパスワードが正しくありません');

      // セッションは作成されない
      expect(sessionModule.createSession).not.toHaveBeenCalled();
    });

    it('パスワードが不正な場合、401エラー', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'WrongPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('メールアドレスまたはパスワードが正しくありません');

      // セッションは作成されない
      expect(sessionModule.createSession).not.toHaveBeenCalled();
    });
  });

  describe('異常系 - レート制限', () => {
    it('レート制限を超えた場合、429エラー', async () => {
      (rateLimitModule.checkLoginRateLimit as jest.Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.error.message).toContain('ログイン試行回数が上限を超えました');

      // レート制限で弾かれた場合、DB検索は行われない
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('レート制限チェックでIPアドレスが取得される', async () => {
      (rateLimitModule.getIpFromRequest as jest.Mock).mockReturnValue('192.168.1.100');
      (rateLimitModule.checkLoginRateLimit as jest.Mock).mockReturnValue(true);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'Test1234!',
        }),
      });

      await POST(request);

      expect(rateLimitModule.getIpFromRequest).toHaveBeenCalledWith(request);
      expect(rateLimitModule.checkLoginRateLimit).toHaveBeenCalledWith('192.168.1.100');
    });
  });

  describe('異常系 - サーバーエラー', () => {
    it('データベースエラーの場合、500エラー', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('サーバーエラーが発生しました');
    });

    it('セッション作成エラーの場合、500エラー', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (sessionModule.createSession as jest.Mock).mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('境界値テスト', () => {
    it('最大長のメールアドレスでログイン成功', async () => {
      const longEmail = 'a'.repeat(240) + '@test.com'; // 250文字程度
      const userWithLongEmail = {
        ...mockUser,
        email: longEmail,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithLongEmail);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (sessionModule.createSession as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: longEmail,
          password: 'Test1234!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('特殊文字を含むパスワードでログイン成功', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (sessionModule.createSession as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sales@test.com',
          password: 'P@ssw0rd!#$%^&*()',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('エッジケース', () => {
    it('JSONパースエラーの場合、適切にハンドリング', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('空のリクエストボディの場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
