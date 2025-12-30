import { NextResponse } from 'next/server';
import { destroySession, isAuthenticated } from '@/lib/session';
import { resetCsrfToken } from '@/lib/csrf';

/**
 * POST /api/auth/logout
 * ログアウト処理
 */
export async function POST() {
  try {
    // 認証チェック
    const authenticated = await isAuthenticated();
    if (!authenticated) {
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

    // CSRFトークンをリセット
    await resetCsrfToken();

    // セッションを破棄
    await destroySession();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Logout error:', error);
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
