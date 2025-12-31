/**
 * レート制限のストレージ
 * 本番環境ではRedis等の外部ストレージを使用することを推奨
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * レート制限のオプション
 */
interface RateLimitOptions {
  interval: number; // ミリ秒単位の時間間隔
  maxRequests: number; // 時間間隔内の最大リクエスト数
}

/**
 * レート制限を適用
 * @param identifier 識別子（IPアドレスやユーザーID等）
 * @param options レート制限のオプション
 * @returns 制限を超えていない場合はtrue、超えている場合はfalse
 */
export function checkRateLimit(identifier: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // エントリが存在しない、または期限切れの場合は新規作成
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + options.interval,
    });
    return true;
  }

  // リクエスト数が制限を超えている場合
  if (entry.count >= options.maxRequests) {
    return false;
  }

  // カウントを増やす
  entry.count += 1;
  rateLimitStore.set(identifier, entry);
  return true;
}

/**
 * ログインAPIのレート制限（5回/分）
 */
export function checkLoginRateLimit(identifier: string): boolean {
  return checkRateLimit(identifier, {
    interval: 60 * 1000, // 1分
    maxRequests: 5,
  });
}

/**
 * 一般APIのレート制限（100回/分）
 */
export function checkApiRateLimit(identifier: string): boolean {
  return checkRateLimit(identifier, {
    interval: 60 * 1000, // 1分
    maxRequests: 100,
  });
}

/**
 * レート制限ストアをクリーンアップ（期限切れエントリの削除）
 * 定期的に実行することを推奨
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * リクエストからIPアドレスを取得
 */
export function getIpFromRequest(request: Request): string {
  // X-Forwarded-Forヘッダーから取得（プロキシ経由の場合）
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // X-Real-IPヘッダーから取得
  const realIp = request.headers.get('X-Real-IP');
  if (realIp) {
    return realIp;
  }

  // デフォルト値（開発環境用）
  return 'unknown';
}
