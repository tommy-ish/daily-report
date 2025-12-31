/**
 * セッションデータの型定義
 */
export interface SessionData {
  /** ユーザーID */
  userId?: number;
  /** ユーザー名 */
  name?: string;
  /** メールアドレス */
  email?: string;
  /** ユーザーロール (sales: 営業, manager: 上長, admin: 管理者) */
  role?: 'sales' | 'manager' | 'admin';
  /** 上長ID (営業の場合のみ) */
  managerId?: number | null;
  /** セッションが作成された時刻 (Unix timestamp) */
  createdAt?: number;
  /** CSRFトークン */
  csrfToken?: string;
  /** 最終アクティブ時刻 (Unix timestamp) */
  lastActivity?: number;
}

/**
 * セッションオプションの型定義
 */
export interface SessionOptions {
  /** セッションのCookie名 */
  cookieName: string;
  /** セッション暗号化パスワード (32文字以上) */
  password: string;
  /** Cookieのオプション */
  cookieOptions: {
    /** Secure属性 (HTTPSのみ) */
    secure: boolean;
    /** HttpOnly属性 (JavaScriptからアクセス不可) */
    httpOnly: boolean;
    /** SameSite属性 (CSRF対策) */
    sameSite: 'lax' | 'strict' | 'none';
    /** 最大有効期限 (秒単位) */
    maxAge: number;
    /** パス */
    path: string;
  };
}
