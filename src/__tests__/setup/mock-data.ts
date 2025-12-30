import { UserRole } from '@prisma/client';

/**
 * テスト用のモックデータ
 */

export const mockUsers = {
  admin: {
    id: 1,
    name: '管理太郎',
    email: 'admin@test.com',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
    managerId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  manager: {
    id: 2,
    name: '上長一郎',
    email: 'manager1@test.com',
    password: 'hashedPassword',
    role: UserRole.MANAGER,
    managerId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  sales: {
    id: 10,
    name: '営業太郎',
    email: 'sales1@test.com',
    password: 'hashedPassword',
    role: UserRole.SALES,
    managerId: 2,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
};

export const mockCustomers = {
  customer1: {
    id: 100,
    name: '山田太郎',
    company: '株式会社ABC',
    department: '営業部',
    phone: '03-1234-5678',
    email: 'yamada@abc.co.jp',
    address: '東京都渋谷区...',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
};

export const mockDailyReports = {
  report1: {
    id: 1,
    userId: 10,
    reportDate: new Date('2025-12-30'),
    problem: '新規顧客の開拓が課題',
    plan: '既存顧客から紹介をもらう',
    createdAt: new Date('2025-12-30T09:00:00Z'),
    updatedAt: new Date('2025-12-30T09:00:00Z'),
  },
};

export const mockVisits = {
  visit1: {
    id: 1,
    dailyReportId: 1,
    customerId: 100,
    visitTime: new Date('1970-01-01T10:00:00Z'),
    content: '新製品の提案',
    outcome: '好感触、次回プレゼンの約束',
    createdAt: new Date('2025-12-30T09:00:00Z'),
    updatedAt: new Date('2025-12-30T09:00:00Z'),
  },
};

export const mockComments = {
  comment1: {
    id: 1,
    dailyReportId: 1,
    userId: 2,
    content: '良い結果ですね。引き続き頑張ってください。',
    createdAt: new Date('2025-12-30T20:00:00Z'),
    updatedAt: new Date('2025-12-30T20:00:00Z'),
  },
};
