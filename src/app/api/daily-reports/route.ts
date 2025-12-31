import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

/**
 * 日報一覧取得のクエリパラメータバリデーションスキーマ
 */
const querySchema = z.object({
  userId: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        return undefined;
      }
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? undefined : parsed;
    })
    .refine((val) => val === undefined || !isNaN(val), 'userIdは数値で指定してください'),
  startDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      '日付はYYYY-MM-DD形式で入力してください'
    ),
  endDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      '日付はYYYY-MM-DD形式で入力してください'
    ),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10)),
});

/**
 * GET /api/daily-reports
 * 日報一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      );
    }

    // クエリパラメータの取得とバリデーション
    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get('userId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力値が不正です',
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { userId, startDate, endDate, page, limit } = validationResult.data;

    // ページネーションの検証
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ページ番号は1以上、1ページあたりの件数は1〜100の範囲で指定してください',
          },
        },
        { status: 400 }
      );
    }

    // 権限チェック
    if (currentUser.role === 'SALES') {
      // 営業担当者は自分の日報のみ取得可能
      if (userId && userId !== currentUser.userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'アクセス権限がありません',
            },
          },
          { status: 403 }
        );
      }
    } else if (currentUser.role === 'MANAGER') {
      // 上長の場合、userIdが指定されている場合は部下かどうかを確認
      if (userId) {
        const subordinate = await prisma.user.findFirst({
          where: {
            id: userId,
            managerId: currentUser.userId,
          },
        });

        if (!subordinate) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'アクセス権限がありません',
              },
            },
            { status: 403 }
          );
        }
      }
    } else if (currentUser.role !== 'ADMIN') {
      // SALES、MANAGER、ADMIN以外の役割は拒否
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        },
        { status: 403 }
      );
    }

    // クエリ条件を構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: any = {};

    // ユーザーフィルター
    if (currentUser.role === 'SALES') {
      whereConditions.userId = currentUser.userId;
    } else if (currentUser.role === 'MANAGER') {
      if (userId) {
        whereConditions.userId = userId;
      } else {
        // 部下全員の日報を取得
        const subordinates = await prisma.user.findMany({
          where: { managerId: currentUser.userId },
          select: { id: true },
        });
        const subordinateIds = subordinates.map((s) => s.id);
        whereConditions.userId = { in: subordinateIds };
      }
    } else if (currentUser.role === 'ADMIN' && userId) {
      whereConditions.userId = userId;
    }

    // 日付フィルター
    if (startDate || endDate) {
      whereConditions.reportDate = {};
      if (startDate) {
        whereConditions.reportDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereConditions.reportDate.lte = new Date(endDate);
      }
    }

    // 総件数を取得
    const totalItems = await prisma.dailyReport.count({
      where: whereConditions,
    });

    // ページネーション計算
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    // 日報一覧を取得
    const dailyReports = await prisma.dailyReport.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        reportDate: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        visits: {
          select: {
            id: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
      },
    });

    // レスポンスデータを整形
    const items = dailyReports.map((report) => ({
      id: report.id,
      userId: report.userId,
      userName: report.user.name,
      reportDate: report.reportDate.toISOString().split('T')[0],
      problem: report.problem,
      plan: report.plan,
      visitCount: report.visits.length,
      commentCount: report.comments.length,
      hasUnreadComments: false, // TODO: 未読コメント機能は将来実装
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Daily reports list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
