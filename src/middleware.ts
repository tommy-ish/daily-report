import { type NextRequest, NextResponse } from 'next/server';

/**
 * 認証が不要なパス
 */
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/_next', '/favicon.ico'];

/**
 * CSRFチェックが不要なパス
 */
const CSRF_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/logout'];

/**
 * パスが公開パスかどうかを判定する
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * パスがCSRF保護が必要かどうかを判定する
 */
function requiresCsrfProtection(pathname: string, method: string): boolean {
  // GETリクエストはCSRF保護不要
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method.toUpperCase())) {
    return false;
  }

  // CSRFチェック免除パスの場合
  if (CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path))) {
    return false;
  }

  return true;
}

/**
 * Next.js Middleware
 *
 * セッション管理とCSRF保護を実装
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 公開パスの場合は何もしない
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // セッションCookieの存在確認
  const sessionCookie = request.cookies.get('daily-report-session');

  // セッションが存在しない場合、ログインページにリダイレクト
  if (!sessionCookie) {
    // APIリクエストの場合は401を返す
    if (pathname.startsWith('/api/')) {
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

    // 通常のページリクエストの場合はログインページにリダイレクト
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CSRF保護が必要な場合
  if (requiresCsrfProtection(pathname, method)) {
    const csrfToken = request.headers.get('x-csrf-token');

    // CSRFトークンが存在しない場合
    if (!csrfToken) {
      // APIリクエストの場合は403を返す
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'CSRFトークンが必要です',
            },
          },
          { status: 403 }
        );
      }
    }

    // 注意: CSRFトークンの実際の検証はAPIルートハンドラー内で行う
    // ここでは存在確認のみを行う
  }

  return NextResponse.next();
}

/**
 * Middlewareを適用するパスの設定
 */
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - api (APIルート)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
