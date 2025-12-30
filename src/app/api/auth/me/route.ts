import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

/**
 * GET /api/auth/me
 * 現在のユーザー情報取得
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
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

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          managerId: user.managerId,
          csrfToken: user.csrfToken,
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
