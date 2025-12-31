import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/prisma';
import { checkLoginRateLimit, getIpFromRequest } from '@/lib/rate-limit';
import { createSession } from '@/lib/session';

/**
 * ログインリクエストのバリデーションスキーマ
 */
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

/**
 * POST /api/auth/login
 * ログイン処理
 */
export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const ip = getIpFromRequest(request);
    if (!checkLoginRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'ログイン試行回数が上限を超えました。しばらく待ってから再度お試しください。',
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // バリデーション
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力値が不正です',
            details: result.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        managerId: true,
        manager: {
          select: {
            name: true,
          },
        },
      },
    });

    // ユーザーが存在しない、またはパスワードが一致しない場合
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'メールアドレスまたはパスワードが正しくありません',
          },
        },
        { status: 401 }
      );
    }

    // セッションを作成
    await createSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId,
    });

    // CSRFトークンを生成
    const csrfToken = await generateCsrfToken();

    // セッション有効期限（30分後）
    const sessionExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // レスポンス
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            managerId: user.managerId,
            managerName: user.manager?.name || null,
          },
          csrfToken,
          sessionExpiry,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
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
