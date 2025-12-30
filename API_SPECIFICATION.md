# API仕様書

## 1. 共通仕様

### 1.1 ベースURL

```
https://api.daily-report.example.com/v1
```

### 1.2 認証方式

- セッションベース認証（Cookie使用）
- ログイン後にセッションCookieを発行
- 各APIリクエストにセッションCookieを含める

### 1.3 リクエストヘッダー

```
Content-Type: application/json
Accept: application/json
X-CSRF-Token: <token> // CSRF対策用トークン
```

### 1.4 共通レスポンス形式

**成功時（200, 201）**:

```json
{
  "success": true,
  "data": { ... }
}
```

**エラー時（4xx, 5xx）**:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [ ... ] // バリデーションエラー等の詳細
  }
}
```

### 1.5 HTTPステータスコード

| コード | 意味                  | 使用例                 |
| ------ | --------------------- | ---------------------- |
| 200    | OK                    | 取得・更新成功         |
| 201    | Created               | 作成成功               |
| 204    | No Content            | 削除成功               |
| 400    | Bad Request           | バリデーションエラー   |
| 401    | Unauthorized          | 未認証                 |
| 403    | Forbidden             | 権限不足               |
| 404    | Not Found             | リソースが存在しない   |
| 409    | Conflict              | 重複エラー             |
| 422    | Unprocessable Entity  | ビジネスロジックエラー |
| 500    | Internal Server Error | サーバーエラー         |

### 1.6 ページネーション

**リクエストパラメータ**:

```
?page=1&limit=20
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 2. APIエンドポイント一覧

### 2.1 認証

| メソッド | エンドポイント | 概要                   | 権限       |
| -------- | -------------- | ---------------------- | ---------- |
| POST     | /auth/login    | ログイン               | -          |
| POST     | /auth/logout   | ログアウト             | 全ユーザー |
| GET      | /auth/me       | 現在のユーザー情報取得 | 全ユーザー |

### 2.2 日報

| メソッド | エンドポイント            | 概要         | 権限             |
| -------- | ------------------------- | ------------ | ---------------- |
| GET      | /daily-reports            | 日報一覧取得 | 営業・上長       |
| GET      | /daily-reports/:id        | 日報詳細取得 | 営業・上長       |
| POST     | /daily-reports            | 日報作成     | 営業             |
| PUT      | /daily-reports/:id        | 日報更新     | 営業（自分のみ） |
| DELETE   | /daily-reports/:id        | 日報削除     | 営業（自分のみ） |
| GET      | /daily-reports/statistics | 統計情報取得 | 上長             |

### 2.3 訪問記録

| メソッド | エンドポイント                  | 概要         | 権限                   |
| -------- | ------------------------------- | ------------ | ---------------------- |
| POST     | /daily-reports/:reportId/visits | 訪問記録追加 | 営業（自分の日報のみ） |
| PUT      | /visits/:id                     | 訪問記録更新 | 営業（自分のみ）       |
| DELETE   | /visits/:id                     | 訪問記録削除 | 営業（自分のみ）       |

### 2.4 コメント

| メソッド | エンドポイント                    | 概要             | 権限             |
| -------- | --------------------------------- | ---------------- | ---------------- |
| GET      | /daily-reports/:reportId/comments | コメント一覧取得 | 営業・上長       |
| POST     | /daily-reports/:reportId/comments | コメント投稿     | 上長             |
| PUT      | /comments/:id                     | コメント更新     | 上長（自分のみ） |
| DELETE   | /comments/:id                     | コメント削除     | 上長（自分のみ） |

### 2.5 顧客マスタ

| メソッド | エンドポイント | 概要         | 権限       |
| -------- | -------------- | ------------ | ---------- |
| GET      | /customers     | 顧客一覧取得 | 営業・上長 |
| GET      | /customers/:id | 顧客詳細取得 | 営業・上長 |
| POST     | /customers     | 顧客作成     | 営業・上長 |
| PUT      | /customers/:id | 顧客更新     | 営業・上長 |
| DELETE   | /customers/:id | 顧客削除     | 営業・上長 |

### 2.6 ユーザー（営業マスタ）

| メソッド | エンドポイント          | 概要             | 権限   |
| -------- | ----------------------- | ---------------- | ------ |
| GET      | /users                  | ユーザー一覧取得 | 管理者 |
| GET      | /users/:id              | ユーザー詳細取得 | 管理者 |
| POST     | /users                  | ユーザー作成     | 管理者 |
| PUT      | /users/:id              | ユーザー更新     | 管理者 |
| DELETE   | /users/:id              | ユーザー削除     | 管理者 |
| GET      | /users/:id/subordinates | 部下一覧取得     | 上長   |

---

## 3. API詳細

### 3.1 認証API

#### POST /auth/login

ログイン

**リクエスト**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "山田太郎",
      "email": "user@example.com",
      "role": "sales",
      "managerId": 2,
      "managerName": "鈴木一郎"
    },
    "sessionExpiry": "2025-12-30T15:00:00Z"
  }
}
```

**エラー**:

- 401: メールアドレスまたはパスワードが正しくない

---

#### POST /auth/logout

ログアウト

**リクエスト**: なし

**レスポンス** (204): No Content

---

#### GET /auth/me

現在のユーザー情報取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "user@example.com",
    "role": "sales",
    "managerId": 2,
    "managerName": "鈴木一郎",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

### 3.2 日報API

#### GET /daily-reports

日報一覧取得

**クエリパラメータ**:

```
?userId=1              // ユーザーID（上長のみ指定可能、営業は自分のみ）
&startDate=2025-12-01  // 開始日
&endDate=2025-12-31    // 終了日
&page=1                // ページ番号
&limit=20              // 1ページあたりの件数
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "userId": 1,
        "userName": "山田太郎",
        "reportDate": "2025-12-30",
        "problem": "新規顧客の開拓が進んでいない",
        "plan": "既存顧客からの紹介をもらう活動を強化",
        "visitCount": 3,
        "commentCount": 2,
        "hasUnreadComments": true,
        "createdAt": "2025-12-30T09:00:00Z",
        "updatedAt": "2025-12-30T18:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### GET /daily-reports/:id

日報詳細取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "userName": "山田太郎",
    "reportDate": "2025-12-30",
    "problem": "新規顧客の開拓が進んでいない",
    "plan": "既存顧客からの紹介をもらう活動を強化",
    "visits": [
      {
        "id": 1,
        "customerId": 10,
        "customerName": "株式会社ABC",
        "visitTime": "10:00:00",
        "content": "新製品の提案",
        "outcome": "次回プレゼンの約束を取り付けた",
        "createdAt": "2025-12-30T09:00:00Z"
      }
    ],
    "comments": [
      {
        "id": 1,
        "userId": 2,
        "userName": "鈴木一郎",
        "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。",
        "createdAt": "2025-12-30T20:00:00Z",
        "updatedAt": "2025-12-30T20:00:00Z"
      }
    ],
    "createdAt": "2025-12-30T09:00:00Z",
    "updatedAt": "2025-12-30T18:00:00Z"
  }
}
```

**エラー**:

- 404: 日報が存在しない
- 403: アクセス権限がない（他人の日報）

---

#### POST /daily-reports

日報作成

**リクエスト**:

```json
{
  "reportDate": "2025-12-30",
  "problem": "新規顧客の開拓が進んでいない",
  "plan": "既存顧客からの紹介をもらう活動を強化",
  "visits": [
    {
      "customerId": 10,
      "visitTime": "10:00:00",
      "content": "新製品の提案",
      "outcome": "次回プレゼンの約束を取り付けた"
    }
  ]
}
```

**バリデーション**:

- reportDate: 必須、日付形式
- problem: 任意、最大2000文字
- plan: 任意、最大2000文字
- visits: 任意、配列
  - customerId: 必須
  - visitTime: 必須、時刻形式
  - content: 必須、最大1000文字
  - outcome: 任意、最大1000文字

**レスポンス** (201):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "reportDate": "2025-12-30",
    "problem": "新規顧客の開拓が進んでいない",
    "plan": "既存顧客からの紹介をもらう活動を強化",
    "visits": [ ... ],
    "createdAt": "2025-12-30T09:00:00Z",
    "updatedAt": "2025-12-30T09:00:00Z"
  }
}
```

**エラー**:

- 400: バリデーションエラー
- 409: 同じ日付の日報が既に存在する

---

#### PUT /daily-reports/:id

日報更新

**リクエスト**:

```json
{
  "problem": "新規顧客の開拓が進んでいない（更新）",
  "plan": "既存顧客からの紹介をもらう活動を強化（更新）"
}
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "reportDate": "2025-12-30",
    "problem": "新規顧客の開拓が進んでいない（更新）",
    "plan": "既存顧客からの紹介をもらう活動を強化（更新）",
    "visits": [ ... ],
    "createdAt": "2025-12-30T09:00:00Z",
    "updatedAt": "2025-12-30T18:00:00Z"
  }
}
```

**エラー**:

- 404: 日報が存在しない
- 403: アクセス権限がない（他人の日報）

---

#### DELETE /daily-reports/:id

日報削除

**レスポンス** (204): No Content

**エラー**:

- 404: 日報が存在しない
- 403: アクセス権限がない（他人の日報）

---

#### GET /daily-reports/statistics

統計情報取得（上長向け）

**クエリパラメータ**:

```
?userId=1              // 部下のユーザーID（任意、未指定時は全部下）
&startDate=2025-12-01  // 開始日
&endDate=2025-12-31    // 終了日
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReports": 20,
      "totalVisits": 60,
      "averageVisitsPerDay": 3.0,
      "reportSubmissionRate": 0.95
    },
    "byUser": [
      {
        "userId": 1,
        "userName": "山田太郎",
        "reportCount": 20,
        "visitCount": 60,
        "averageVisitsPerDay": 3.0
      }
    ],
    "byDate": [
      {
        "date": "2025-12-30",
        "reportCount": 1,
        "visitCount": 3
      }
    ]
  }
}
```

---

### 3.3 訪問記録API

#### POST /daily-reports/:reportId/visits

訪問記録追加

**リクエスト**:

```json
{
  "customerId": 10,
  "visitTime": "14:00:00",
  "content": "製品デモの実施",
  "outcome": "好感触、導入検討を約束"
}
```

**レスポンス** (201):

```json
{
  "success": true,
  "data": {
    "id": 2,
    "dailyReportId": 1,
    "customerId": 10,
    "customerName": "株式会社XYZ",
    "visitTime": "14:00:00",
    "content": "製品デモの実施",
    "outcome": "好感触、導入検討を約束",
    "createdAt": "2025-12-30T14:30:00Z"
  }
}
```

**エラー**:

- 404: 日報が存在しない
- 403: アクセス権限がない（他人の日報）

---

#### PUT /visits/:id

訪問記録更新

**リクエスト**:

```json
{
  "customerId": 10,
  "visitTime": "14:00:00",
  "content": "製品デモの実施（更新）",
  "outcome": "好感触、導入検討を約束（更新）"
}
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 2,
    "dailyReportId": 1,
    "customerId": 10,
    "customerName": "株式会社XYZ",
    "visitTime": "14:00:00",
    "content": "製品デモの実施（更新）",
    "outcome": "好感触、導入検討を約束（更新）",
    "createdAt": "2025-12-30T14:30:00Z",
    "updatedAt": "2025-12-30T18:00:00Z"
  }
}
```

**エラー**:

- 404: 訪問記録が存在しない
- 403: アクセス権限がない（他人の訪問記録）

---

#### DELETE /visits/:id

訪問記録削除

**レスポンス** (204): No Content

**エラー**:

- 404: 訪問記録が存在しない
- 403: アクセス権限がない（他人の訪問記録）

---

### 3.4 コメントAPI

#### GET /daily-reports/:reportId/comments

コメント一覧取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "dailyReportId": 1,
        "userId": 2,
        "userName": "鈴木一郎",
        "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。",
        "createdAt": "2025-12-30T20:00:00Z",
        "updatedAt": "2025-12-30T20:00:00Z"
      }
    ]
  }
}
```

---

#### POST /daily-reports/:reportId/comments

コメント投稿

**リクエスト**:

```json
{
  "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。"
}
```

**バリデーション**:

- content: 必須、最大2000文字

**レスポンス** (201):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "dailyReportId": 1,
    "userId": 2,
    "userName": "鈴木一郎",
    "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。",
    "createdAt": "2025-12-30T20:00:00Z",
    "updatedAt": "2025-12-30T20:00:00Z"
  }
}
```

**エラー**:

- 404: 日報が存在しない
- 403: 上長権限がない

---

#### PUT /comments/:id

コメント更新

**リクエスト**:

```json
{
  "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。（更新）"
}
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "dailyReportId": 1,
    "userId": 2,
    "userName": "鈴木一郎",
    "content": "良い結果ですね。次回のプレゼン資料は一緒に確認しましょう。（更新）",
    "createdAt": "2025-12-30T20:00:00Z",
    "updatedAt": "2025-12-30T21:00:00Z"
  }
}
```

**エラー**:

- 404: コメントが存在しない
- 403: アクセス権限がない（他人のコメント）

---

#### DELETE /comments/:id

コメント削除

**レスポンス** (204): No Content

**エラー**:

- 404: コメントが存在しない
- 403: アクセス権限がない（他人のコメント）

---

### 3.5 顧客マスタAPI

#### GET /customers

顧客一覧取得

**クエリパラメータ**:

```
?search=ABC           // 顧客名・会社名で検索
&page=1               // ページ番号
&limit=20             // 1ページあたりの件数
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 10,
        "name": "山田花子",
        "company": "株式会社ABC",
        "department": "営業部",
        "phone": "03-1234-5678",
        "email": "hanako@abc.co.jp",
        "address": "東京都渋谷区...",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### GET /customers/:id

顧客詳細取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "山田花子",
    "company": "株式会社ABC",
    "department": "営業部",
    "phone": "03-1234-5678",
    "email": "hanako@abc.co.jp",
    "address": "東京都渋谷区...",
    "visitHistory": [
      {
        "visitDate": "2025-12-30",
        "visitTime": "10:00:00",
        "salesName": "山田太郎",
        "content": "新製品の提案"
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**エラー**:

- 404: 顧客が存在しない

---

#### POST /customers

顧客作成

**リクエスト**:

```json
{
  "name": "山田花子",
  "company": "株式会社ABC",
  "department": "営業部",
  "phone": "03-1234-5678",
  "email": "hanako@abc.co.jp",
  "address": "東京都渋谷区..."
}
```

**バリデーション**:

- name: 必須、最大100文字
- company: 必須、最大100文字
- department: 任意、最大100文字
- phone: 任意、電話番号形式
- email: 任意、メールアドレス形式
- address: 任意、最大255文字

**レスポンス** (201):

```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "山田花子",
    "company": "株式会社ABC",
    "department": "営業部",
    "phone": "03-1234-5678",
    "email": "hanako@abc.co.jp",
    "address": "東京都渋谷区...",
    "createdAt": "2025-12-30T10:00:00Z",
    "updatedAt": "2025-12-30T10:00:00Z"
  }
}
```

---

#### PUT /customers/:id

顧客更新

**リクエスト**: 同上（POST /customers）

**レスポンス** (200): 同上

**エラー**:

- 404: 顧客が存在しない

---

#### DELETE /customers/:id

顧客削除

**レスポンス** (204): No Content

**エラー**:

- 404: 顧客が存在しない
- 409: 訪問記録が存在するため削除できない

---

### 3.6 ユーザー（営業マスタ）API

#### GET /users

ユーザー一覧取得

**クエリパラメータ**:

```
?search=山田          // 氏名で検索
&role=sales          // 役割で絞り込み（sales/manager）
&page=1              // ページ番号
&limit=20            // 1ページあたりの件数
```

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "山田太郎",
        "email": "yamada@example.com",
        "role": "sales",
        "managerId": 2,
        "managerName": "鈴木一郎",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### GET /users/:id

ユーザー詳細取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "managerId": 2,
    "managerName": "鈴木一郎",
    "statistics": {
      "totalReports": 100,
      "totalVisits": 300,
      "averageVisitsPerDay": 3.0
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**エラー**:

- 404: ユーザーが存在しない

---

#### POST /users

ユーザー作成

**リクエスト**:

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "password123",
  "role": "sales",
  "managerId": 2
}
```

**バリデーション**:

- name: 必須、最大100文字
- email: 必須、メールアドレス形式、ユニーク
- password: 必須、最小8文字
- role: 必須、sales/manager
- managerId: roleがsalesの場合は必須

**レスポンス** (201):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "sales",
    "managerId": 2,
    "managerName": "鈴木一郎",
    "createdAt": "2025-12-30T10:00:00Z",
    "updatedAt": "2025-12-30T10:00:00Z"
  }
}
```

**エラー**:

- 400: バリデーションエラー
- 409: メールアドレスが既に使用されている

---

#### PUT /users/:id

ユーザー更新

**リクエスト**:

```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "newpassword123", // 任意、変更する場合のみ
  "role": "sales",
  "managerId": 2
}
```

**レスポンス** (200): 同上（POST /users）

**エラー**:

- 404: ユーザーが存在しない
- 409: メールアドレスが既に使用されている

---

#### DELETE /users/:id

ユーザー削除

**レスポンス** (204): No Content

**エラー**:

- 404: ユーザーが存在しない
- 409: 日報が存在するため削除できない

---

#### GET /users/:id/subordinates

部下一覧取得

**レスポンス** (200):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "山田太郎",
        "email": "yamada@example.com",
        "role": "sales",
        "recentActivity": {
          "lastReportDate": "2025-12-30",
          "reportsThisWeek": 5,
          "visitsThisWeek": 15
        }
      }
    ]
  }
}
```

**エラー**:

- 404: ユーザーが存在しない
- 403: 上長権限がない

---

## 4. エラーコード一覧

| コード              | メッセージ                                       | 説明                 |
| ------------------- | ------------------------------------------------ | -------------------- |
| VALIDATION_ERROR    | 入力値が不正です                                 | バリデーションエラー |
| UNAUTHORIZED        | 認証が必要です                                   | 未認証               |
| FORBIDDEN           | アクセス権限がありません                         | 権限不足             |
| NOT_FOUND           | リソースが見つかりません                         | リソースが存在しない |
| DUPLICATE           | 既に存在します                                   | 重複エラー           |
| CONFLICT            | 関連データが存在するため削除できません           | 削除時の制約エラー   |
| INVALID_CREDENTIALS | メールアドレスまたはパスワードが正しくありません | ログインエラー       |
| SESSION_EXPIRED     | セッションが期限切れです                         | セッション期限切れ   |
| INTERNAL_ERROR      | サーバーエラーが発生しました                     | サーバーエラー       |

---

## 5. セキュリティ

### 5.1 CSRF対策

- 各変更APIリクエストに `X-CSRF-Token` ヘッダーが必要
- トークンはログイン時に発行し、セッションに紐づける

### 5.2 レート制限

- ログインAPI: 5回/分
- その他API: 100回/分
- 制限超過時は429 Too Many Requestsを返す

### 5.3 データアクセス制御

- 営業担当者: 自分の日報・訪問記録のみアクセス可能
- 上長: 自分の部下の日報にアクセス可能
- 管理者: すべてのデータにアクセス可能

### 5.4 パスワードポリシー

- 最小8文字
- 英数字を含む（推奨）
- ハッシュ化して保存（bcrypt等）

---

## 6. WebSocket（将来拡張）

### 6.1 リアルタイム通知

```
ws://api.daily-report.example.com/v1/ws
```

**イベント**:

- `comment.created`: コメント投稿時
- `report.submitted`: 日報提出時（上長に通知）

**メッセージ形式**:

```json
{
  "event": "comment.created",
  "data": {
    "commentId": 1,
    "dailyReportId": 1,
    "userId": 2,
    "userName": "鈴木一郎",
    "content": "良い結果ですね。"
  },
  "timestamp": "2025-12-30T20:00:00Z"
}
```

---

## 7. バージョニング

### 7.1 APIバージョン

- URLパスにバージョンを含める（例: `/v1/daily-reports`）
- メジャーバージョンアップ時は新しいエンドポイントを作成
- 旧バージョンは最低6ヶ月間サポート

### 7.2 変更履歴

- v1.0.0 (2025-12-30): 初版リリース

---

## 8. テスト環境

### 8.1 テストURL

```
https://api-test.daily-report.example.com/v1
```

### 8.2 テストアカウント

```
営業担当者:
  email: sales@test.example.com
  password: test1234

上長:
  email: manager@test.example.com
  password: test1234
```
