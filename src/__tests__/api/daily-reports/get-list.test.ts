/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/daily-reports/route';
import { prisma } from '@/lib/prisma';
import * as sessionModule from '@/lib/session';

// モック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session');

describe('GET /api/daily-reports', () => {
  const mockSalesUser = {
    userId: 10,
    name: '営業太郎',
    email: 'sales@test.com',
    role: 'SALES' as const,
    managerId: 2,
    isLoggedIn: true,
  };

  const mockManagerUser = {
    userId: 2,
    name: '上長一郎',
    email: 'manager@test.com',
    role: 'MANAGER' as const,
    managerId: null,
    isLoggedIn: true,
  };

  const mockAdminUser = {
    userId: 1,
    name: '管理者',
    email: 'admin@test.com',
    role: 'ADMIN' as const,
    managerId: null,
    isLoggedIn: true,
  };

  const mockDailyReports = [
    {
      id: 1,
      userId: 10,
      reportDate: new Date('2025-12-30'),
      problem: '新規顧客の開拓が進んでいない',
      plan: '既存顧客からの紹介をもらう活動を強化',
      createdAt: new Date('2025-12-30T09:00:00Z'),
      updatedAt: new Date('2025-12-30T18:00:00Z'),
      user: { name: '営業太郎' },
      visits: [{ id: 1 }, { id: 2 }, { id: 3 }],
      comments: [{ id: 1 }, { id: 2 }],
    },
    {
      id: 2,
      userId: 10,
      reportDate: new Date('2025-12-29'),
      problem: null,
      plan: null,
      createdAt: new Date('2025-12-29T09:00:00Z'),
      updatedAt: new Date('2025-12-29T18:00:00Z'),
      user: { name: '営業太郎' },
      visits: [{ id: 4 }],
      comments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系 - 営業担当者', () => {
    it('営業担当者が自分の日報一覧を取得できる (200)', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=1&limit=20');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.items[0]).toEqual({
        id: 1,
        userId: 10,
        userName: '営業太郎',
        reportDate: '2025-12-30',
        problem: '新規顧客の開拓が進んでいない',
        plan: '既存顧客からの紹介をもらう活動を強化',
        visitCount: 3,
        commentCount: 2,
        hasUnreadComments: false,
        createdAt: '2025-12-30T09:00:00.000Z',
        updatedAt: '2025-12-30T18:00:00.000Z',
      });

      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 20,
        hasNext: false,
        hasPrev: false,
      });

      // 正しいクエリが実行されたか検証
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: { userId: 10 },
      });
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
        where: { userId: 10 },
        skip: 0,
        take: 20,
        orderBy: { reportDate: 'desc' },
        include: {
          user: { select: { name: true } },
          visits: { select: { id: true } },
          comments: { select: { id: true } },
        },
      });
    });

    it('営業担当者が日付範囲で絞り込みできる', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(1);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest(
        'http://localhost:3000/api/daily-reports?startDate=2025-12-01&endDate=2025-12-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // 日付フィルターが適用されたか検証
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: {
          userId: 10,
          reportDate: {
            gte: new Date('2025-12-01'),
            lte: new Date('2025-12-31'),
          },
        },
      });
    });

    it('ページネーションが正しく動作する', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(50);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=2&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 2,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 10,
        hasNext: true,
        hasPrev: true,
      });

      // 正しいスキップとテイクが適用されたか検証
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('デフォルトのページネーション値が適用される', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(data.data.pagination.itemsPerPage).toBe(20);
    });

    it('日報が0件の場合でも正常に動作する', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(0);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(0);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('正常系 - 上長', () => {
    it('上長が部下全員の日報一覧を取得できる', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockManagerUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 10 }, { id: 11 }, { id: 12 }]);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // 部下全員のIDで検索されているか検証
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { managerId: 2 },
        select: { id: true },
      });
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: { userId: { in: [10, 11, 12] } },
      });
    });

    it('上長が特定の部下の日報を取得できる', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockManagerUser);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 10, managerId: 2 });
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?userId=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // 部下かどうかチェックされているか検証
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 10, managerId: 2 },
      });
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: { userId: 10 },
      });
    });
  });

  describe('正常系 - 管理者', () => {
    it('管理者が全ユーザーの日報を取得できる', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // userIdフィルターなしで検索されているか検証
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: {},
      });
    });

    it('管理者が特定ユーザーの日報を取得できる', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(2);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue(mockDailyReports);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?userId=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: { userId: 10 },
      });
    });
  });

  describe('異常系 - 認証エラー', () => {
    it('未認証の場合、401エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('認証が必要です');

      // DB検索は行われない
      expect(prisma.dailyReport.findMany).not.toHaveBeenCalled();
    });
  });

  describe('異常系 - 権限エラー', () => {
    it('営業担当者が他人のuserIdを指定した場合、403エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?userId=999');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('アクセス権限がありません');
    });

    it('上長が部下でないユーザーのuserIdを指定した場合、403エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockManagerUser);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?userId=999');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toBe('アクセス権限がありません');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 999, managerId: 2 },
      });
    });
  });

  describe('異常系 - バリデーションエラー', () => {
    beforeEach(() => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
    });

    it('userIdが数値でない場合、undefinedとして扱われ自分の日報を取得', async () => {
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(0);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?userId=abc');

      const response = await GET(request);

      // userIdのパースが失敗した場合はundefinedとして扱われ、自分の日報を取得
      expect(response.status).toBe(200);
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: { userId: 10 },
      });
    });

    it('startDateの形式が不正な場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?startDate=invalid');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('endDateの形式が不正な場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?endDate=2025/12/31');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('pageが0以下の場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('ページ番号は1以上');
    });

    it('pageが負の値の場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('limitが0以下の場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?limit=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('limitが100を超える場合、400エラー', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-reports?limit=101');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('1〜100の範囲');
    });
  });

  describe('境界値テスト', () => {
    beforeEach(() => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
    });

    it('page=1, limit=1で正常に動作する', async () => {
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(10);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=1&limit=1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 10,
        totalItems: 10,
        itemsPerPage: 1,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('limit=100で正常に動作する', async () => {
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(100);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?limit=100');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.itemsPerPage).toBe(100);
    });

    it('最後のページを取得できる', async () => {
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(50);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=5&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 5,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('存在しないページ番号でも正常に動作する（空配列を返す）', async () => {
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(10);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?page=100');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items).toHaveLength(0);
    });
  });

  describe('異常系 - サーバーエラー', () => {
    it('データベースエラーの場合、500エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('サーバーエラーが発生しました');
    });

    it('セッション取得エラーの場合、500エラー', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/daily-reports');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('エッジケース', () => {
    it('startDateのみ指定した場合、正常に動作する', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(1);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest(
        'http://localhost:3000/api/daily-reports?startDate=2025-12-01'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: {
          userId: 10,
          reportDate: {
            gte: new Date('2025-12-01'),
          },
        },
      });
    });

    it('endDateのみ指定した場合、正常に動作する', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(1);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest('http://localhost:3000/api/daily-reports?endDate=2025-12-31');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.dailyReport.count).toHaveBeenCalledWith({
        where: {
          userId: 10,
          reportDate: {
            lte: new Date('2025-12-31'),
          },
        },
      });
    });

    it('同じ日付でstartDateとendDateを指定した場合、正常に動作する', async () => {
      (sessionModule.getCurrentUser as jest.Mock).mockResolvedValue(mockSalesUser);
      (prisma.dailyReport.count as jest.Mock).mockResolvedValue(1);
      (prisma.dailyReport.findMany as jest.Mock).mockResolvedValue([mockDailyReports[0]]);

      const request = new NextRequest(
        'http://localhost:3000/api/daily-reports?startDate=2025-12-30&endDate=2025-12-30'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});
