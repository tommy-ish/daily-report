# セッション管理とCSRF対策の実装

## 概要

本ドキュメントでは、日報管理システムにおけるセッション管理とCSRF対策の実装について説明します。

## 使用技術

- **iron-session**: 暗号化されたCookieベースのセッション管理ライブラリ
- **uuid**: CSRFトークンの生成に使用

## 実装内容

### 1. セッション管理

#### 設定

- **Cookie名**: `daily-report-session`
- **タイムアウト**: 30分
- **Cookie属性**:
  - `secure`: 本番環境ではtrue（HTTPS必須）
  - `httpOnly`: true（JavaScriptからアクセス不可）
  - `sameSite`: lax（CSRF対策）
  - `maxAge`: 1800秒（30分）

#### セッションデータ

```typescript
interface SessionData {
  userId?: number;
  name?: string;
  email?: string;
  role?: 'sales' | 'manager' | 'admin';
  managerId?: number | null;
  createdAt?: number;
  csrfToken?: string;
  lastActivity?: number;
}
```

#### 主要な関数

**`getSession()`**
セッションを取得します。

```typescript
import { getSession } from '@/lib/session';

const session = await getSession();
```

**`isAuthenticated()`**
ユーザーがログインしているか確認します。

```typescript
import { isAuthenticated } from '@/lib/session';

const authenticated = await isAuthenticated();
```

**`createSession(userData)`**
セッションを作成します。

```typescript
import { createSession } from '@/lib/session';

await createSession({
  userId: 1,
  name: '山田太郎',
  email: 'yamada@example.com',
  role: 'sales',
  managerId: 2,
});
```

**`destroySession()`**
セッションを破棄します。

```typescript
import { destroySession } from '@/lib/session';

await destroySession();
```

**`getCurrentUser()`**
現在ログインしているユーザー情報を取得します。

```typescript
import { getCurrentUser } from '@/lib/session';

const user = await getCurrentUser();
if (user) {
  console.log(user.name, user.role);
}
```

**`checkSessionTimeout()`**
セッションのタイムアウトをチェックし、タイムアウトしていない場合は最終アクティビティ時刻を更新します。

```typescript
import { checkSessionTimeout } from '@/lib/session';

const isValid = await checkSessionTimeout();
if (!isValid) {
  // セッションがタイムアウトしている
}
```

### 2. CSRF対策

#### 仕組み

1. ログイン時にCSRFトークンを生成してセッションに保存
2. フロントエンドはこのトークンを取得して保持
3. POST/PUT/DELETEなどの変更系リクエストで `X-CSRF-Token` ヘッダーにトークンを含める
4. サーバー側でトークンを検証

#### 主要な関数

**`generateCsrfToken()`**
CSRFトークンを生成してセッションに保存します。

```typescript
import { generateCsrfToken } from '@/lib/csrf';

const token = await generateCsrfToken();
```

**`verifyCsrfToken(token)`**
CSRFトークンを検証します。

```typescript
import { verifyCsrfToken } from '@/lib/csrf';

const isValid = await verifyCsrfToken(token);
if (!isValid) {
  // トークンが無効
}
```

**`resetCsrfToken()`**
CSRFトークンをリセットします（ログアウト時などに使用）。

```typescript
import { resetCsrfToken } from '@/lib/csrf';

await resetCsrfToken();
```

**`getCsrfTokenFromHeaders(headers)`**
リクエストヘッダーからCSRFトークンを取得します。

```typescript
import { getCsrfTokenFromHeaders } from '@/lib/csrf';

const token = getCsrfTokenFromHeaders(request.headers);
```

**`requiresCsrfProtection(method)`**
HTTPメソッドがCSRF保護が必要かどうかを判定します。

```typescript
import { requiresCsrfProtection } from '@/lib/csrf';

if (requiresCsrfProtection(request.method)) {
  // CSRF検証が必要
}
```

### 3. Next.js Middleware

`src/middleware.ts` でセッションチェックとCSRF保護を実装しています。

#### 動作

1. **公開パス** (`/login`, `/api/auth/login` など) はチェックをスキップ
2. **セッションチェック**: セッションCookieが存在しない場合、ログインページにリダイレクト（APIの場合は401）
3. **CSRF保護**: POST/PUT/DELETEリクエストで `X-CSRF-Token` ヘッダーの存在を確認

### 4. 認証API

#### POST /api/auth/login

ログイン処理を行います。

**リクエスト:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "user@example.com",
      "role": "sales",
      "managerId": 2
    },
    "csrfToken": "abc123...",
    "sessionExpiry": "2025-12-30T15:00:00Z"
  }
}
```

#### POST /api/auth/logout

ログアウト処理を行います。

**レスポンス (204):**

No Content

#### GET /api/auth/me

現在のユーザー情報を取得します。

**レスポンス (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "user@example.com",
    "role": "sales",
    "managerId": 2,
    "csrfToken": "abc123..."
  }
}
```

#### GET /api/csrf-token

CSRFトークンを取得します。

**レスポンス (200):**

```json
{
  "success": true,
  "data": {
    "csrfToken": "abc123..."
  }
}
```

## 使用例

### APIルートでの使用

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { verifyCsrfToken, getCsrfTokenFromHeaders } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // 認証チェック
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

  // CSRF検証
  const csrfToken = getCsrfTokenFromHeaders(request.headers);
  const isValidCsrf = await verifyCsrfToken(csrfToken);
  if (!isValidCsrf) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'CSRFトークンが無効です',
        },
      },
      { status: 403 }
    );
  }

  // 権限チェック
  if (user.role !== 'manager' && user.role !== 'admin') {
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

  // 処理を実行
  // ...

  return NextResponse.json({ success: true, data: {} });
}
```

### フロントエンドでの使用

```typescript
// ログイン
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { data } = await response.json();
const csrfToken = data.csrfToken;

// CSRFトークンを保存（状態管理ライブラリやlocalStorageなどに）
// 注意: localStorageよりも状態管理ライブラリの使用を推奨

// 変更系リクエスト
const response = await fetch('/api/daily-reports', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({
    reportDate: '2025-12-30',
    problem: '...',
    plan: '...',
  }),
});
```

## 環境変数

`.env` ファイルに以下の環境変数を設定してください。

```bash
# セッション暗号化キー（必須 - 32文字以上の複雑な文字列）
SESSION_SECRET="your-secret-key-change-this-in-production-must-be-at-least-32-characters"

# CSRF秘密鍵（将来的に追加の暗号化が必要な場合に使用）
CSRF_SECRET="your-csrf-secret-change-this-in-production"
```

**重要**:
- `SESSION_SECRET`は**必須**です。設定されていない場合、アプリケーションは起動時にエラーを投げます。
- 32文字以上の強力なランダム文字列を設定する必要があります。

```bash
# ランダム文字列の生成例
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## セキュリティ考慮事項

1. **SESSION_SECRET（必須）**:
   - 32文字以上の強力なランダム文字列が必須
   - 設定されていない、または短すぎる場合、アプリケーション起動時にエラーが発生
   - 本番環境では必ず暗号学的に安全なランダム値を使用

2. **HTTPS**: 本番環境では必ずHTTPSを使用（Cookieの `secure` 属性がtrueになる）

3. **タイムアウト**: セッションタイムアウトは30分に設定されており、最終アクティビティから30分経過すると自動的にログアウト

4. **CSRF保護**:
   - すべての変更系リクエスト（POST/PUT/DELETE）でCSRFトークンが必要
   - **タイミング攻撃対策**: `crypto.timingSafeEqual`を使用した定数時間比較により、トークン比較時のタイミング攻撃を防止

5. **HttpOnly Cookie**: セッションCookieは `httpOnly` 属性により、JavaScriptからアクセス不可

6. **SameSite属性**: `lax` に設定されており、クロスサイトリクエストからの保護

7. **暗号化**: セッションデータは `iron-session` により暗号化され、改ざんから保護

## テスト

セッション管理とCSRF機能のテストは `src/__tests__/lib/` に配置されています。

```bash
# テスト実行
npm test

# カバレッジ付きでテスト実行
npm run test:coverage
```

## トラブルシューティング

### アプリケーションが起動しない（SESSION_SECRETエラー）

**エラー**: `SESSION_SECRET environment variable is required`

**原因**: `SESSION_SECRET`環境変数が設定されていません。

**解決方法**:
1. `.env`ファイルを作成（または既存のファイルを編集）
2. 以下のコマンドで強力なランダム文字列を生成:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. 生成された文字列を`.env`ファイルに追加:
   ```
   SESSION_SECRET="生成された文字列"
   ```

**エラー**: `SESSION_SECRET must be at least 32 characters long`

**原因**: `SESSION_SECRET`が32文字未満です。

**解決方法**: 上記と同じ方法で32文字以上のランダム文字列を生成して設定してください。

### セッションが保存されない

- `SESSION_SECRET` が正しく設定されているか確認（32文字以上）
- Cookieが正しく送信されているか確認（ブラウザの開発者ツールで確認）
- 本番環境でHTTPSを使用しているか確認

### CSRFトークンエラー

- リクエストヘッダーに `X-CSRF-Token` が含まれているか確認
- トークンがログイン時に取得されているか確認
- セッションがタイムアウトしていないか確認
- トークンの長さや形式が正しいか確認（UUIDv4形式）

### セッションタイムアウトが早すぎる

- 最終アクティビティから30分経過するとタイムアウトします
- 必要に応じて `src/lib/session.ts` の `SESSION_TIMEOUT` を調整してください

## 参考資料

- [iron-session Documentation](https://github.com/vvo/iron-session)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
