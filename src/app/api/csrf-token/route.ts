import { NextResponse } from 'next/server';

import { generateCsrfToken } from '@/lib/csrf';
import { isAuthenticated } from '@/lib/session';

/**
 * GET /api/csrf-token
 * CSRFトークン取得
 */
export async function GET() {
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

    // CSRFトークンを生成
    const csrfToken = await generateCsrfToken();

    return NextResponse.json(
      {
        success: true,
        data: {
          csrfToken,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get CSRF token error:', error);
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
