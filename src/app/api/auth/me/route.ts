import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

/**
 * GET /api/auth/me
 * 現在のユーザー情報取得
 */
export async function GET() {
  try {
    // セッションから現在のユーザーを取得
    const sessionUser = await getCurrentUser();

    // 未認証の場合
    if (!sessionUser) {
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

    // データベースから最新のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
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

    // ユーザーが存在しない場合（削除された等）
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // レスポンス
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.toLowerCase(),
          managerId: user.managerId,
          managerName: user.manager?.name || null,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
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
