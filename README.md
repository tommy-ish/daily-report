# 日報管理システム

営業担当者が日々の活動を報告し、上長がフィードバックを行うための日報管理システム。

## 📚 ドキュメント

- [要件定義・ER図](./CLAUDE.md)
- [画面定義書](./SCREEN_DESIGN.md)
- [API仕様書](./API_SPECIFICATION.md)
- [テスト仕様書](./TEST_SPECIFICATION.md)

## 🚀 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL
- **ORM**: Prisma 5
- **認証**: セッションベース認証
- **テスト**: Jest, React Testing Library, Playwright
- **リンター**: ESLint, Prettier

## 📦 セットアップ

### 前提条件

- Node.js 18.x 以上
- npm 9.x 以上

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してDATABASE_URLを設定

# Prismaクライアントの生成
npm run prisma:generate

# データベースマイグレーション
npm run prisma:migrate

# 初期データの投入（オプション）
npm run prisma:seed

# 開発サーバーの起動
npm run dev
```

開発サーバーは [http://localhost:3000](http://localhost:3000) で起動します。

## 🛠️ 開発コマンド

```bash
# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバーの起動
npm start

# リンターの実行
npm run lint

# リンターの自動修正
npm run lint:fix

# コードフォーマット
npm run format

# 型チェック
npm run type-check

# テストの実行
npm test

# テストの監視モード
npm run test:watch

# カバレッジレポート
npm run test:coverage

# Prismaクライアント生成
npm run prisma:generate

# データベースマイグレーション
npm run prisma:migrate

# Prisma Studio起動（DBビューア）
npm run prisma:studio

# 初期データ投入
npm run prisma:seed

# E2Eテスト実行
npm run test:e2e

# E2EテストをUIモードで実行
npm run test:e2e:ui
```

## 📁 プロジェクト構造

```
daily-report/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Reactコンポーネント
│   ├── lib/             # ユーティリティ・ヘルパー
│   ├── types/           # TypeScript型定義
│   ├── hooks/           # カスタムフック
│   ├── api/             # APIクライアント
│   └── styles/          # スタイル
├── prisma/              # Prismaスキーマとマイグレーション
│   ├── schema.prisma    # データベーススキーマ定義
│   └── seed.ts          # 初期データ投入スクリプト
├── e2e/                 # E2Eテスト（Playwright）
├── public/              # 静的ファイル
├── CLAUDE.md            # 要件定義・ER図
├── SCREEN_DESIGN.md     # 画面定義書
├── API_SPECIFICATION.md # API仕様書
├── TEST_SPECIFICATION.md # テスト仕様書
└── README.md            # このファイル
```

## 🧪 テスト

### テスト環境

プロジェクトには3種類のテストが含まれています：

1. **単体テスト (Unit Tests)** - Jest + React Testing Library
   - コンポーネント、関数、ユーティリティのテスト
   - カバレッジ目標: 80%以上

2. **統合テスト (Integration Tests)** - Jest + Prisma Mock
   - APIルート、データベース操作のテスト
   - Prisma Clientのモック使用

3. **E2Eテスト (End-to-End Tests)** - Playwright
   - 実際のブラウザでのユーザーフロー検証
   - Chrome、Firefox、Safari、モバイル対応

### テスト実行

```bash
# 全ての単体テストを実行
npm test

# テスト監視モード（変更時に自動実行）
npm run test:watch

# カバレッジレポート生成
npm run test:coverage

# E2Eテスト実行
npm run test:e2e

# E2EテストをUIモードで実行
npm run test:e2e:ui

# E2Eテストレポート表示
npm run test:e2e:report
```

### テストファイルの配置

```
src/
├── __tests__/
│   ├── setup/
│   │   ├── test-utils.tsx    # カスタムレンダー関数
│   │   └── mock-data.ts       # モックデータ
│   ├── lib/
│   │   └── utils.test.ts      # ユーティリティのテスト
│   └── components/
│       └── Button.test.tsx    # コンポーネントのテスト
e2e/
└── example.spec.ts            # E2Eテスト
```

### テストの書き方

**単体テスト例**:

```typescript
import { render, screen } from '@/__tests__/setup/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/Button';

test('should call onClick when clicked', async () => {
  const handleClick = jest.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Click me</Button>);
  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

**E2Eテスト例**:

```typescript
import { test, expect } from '@playwright/test';

test('should display the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('日報管理システム');
});
```

### CI/CD

GitHub Actionsで自動テストが実行されます：

- Lint、型チェック
- 単体テスト（カバレッジ計測）
- E2Eテスト

テストコード作成時の厳守事項については `.claude/CLAUDE.md` を参照してください。

## 📝 コーディング規約

### ESLint ルール

- TypeScript strict モード
- React Hooks のルールを厳守
- import の順序を自動整理
- console.log は警告（console.warn, console.error は許可）
- var 禁止、const を優先

### Prettier 設定

- セミコロン: あり
- シングルクォート: あり
- 1行の最大文字数: 100
- タブ幅: 2スペース

### Git Hooks（Husky）

コミット時に自動的に以下が実行されます：

**pre-commit**: ステージングされたファイルに対して

- ESLint自動修正
- Prettier自動フォーマット
- 関連するテストを実行

**pre-push**: プッシュ前に

- TypeScript型チェック
- 全テストを実行

**commit-msg**: コミットメッセージの検証

- [Conventional Commits](https://www.conventionalcommits.org/) 形式をチェック
- 詳細は [docs/COMMIT_CONVENTION.md](./docs/COMMIT_CONVENTION.md) を参照

コミットメッセージ例：

```bash
git commit -m "feat(auth): ログイン機能を追加"
git commit -m "fix(api): 日報作成時のバリデーションエラーを修正"
git commit -m "docs: READMEにテスト実行方法を追加"
```

## 🔒 セキュリティ

- CSRF対策
- SQLインジェクション対策
- XSS対策
- セッション管理（タイムアウト: 30分）
- レート制限

詳細は [API仕様書](./API_SPECIFICATION.md) を参照してください。

## 🗄️ データベース

### Prismaスキーマ

プロジェクトは Prisma ORM を使用してデータベースを管理しています。

**主要なモデル**:

- `User` - 営業担当者と上長の情報
- `Customer` - 顧客情報
- `DailyReport` - 日報
- `Visit` - 訪問記録
- `Comment` - 上長からのコメント

詳細は `prisma/schema.prisma` を参照してください。

### データベースセットアップ

```bash
# PostgreSQLの起動（Dockerを使用する場合）
docker run --name daily-report-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=daily_report \
  -p 5432:5432 \
  -d postgres:16

# .envファイルのDATABASE_URLを設定
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/daily_report?schema=public"

# マイグレーション実行
npm run prisma:migrate

# 初期データ投入
npm run prisma:seed
```

### Prisma Studio

Prisma Studio でデータベースの内容を視覚的に確認・編集できます：

```bash
npm run prisma:studio
```

ブラウザで [http://localhost:5555](http://localhost:5555) が開きます。

## 🚀 デプロイ

### Cloud Runへのデプロイ

このプロジェクトはGoogle Cloud Runにデプロイできます。

**Makefileを使用した簡単デプロイ**:

```bash
# ヘルプを表示
make help

# 一括デプロイ（ビルド → プッシュ → デプロイ）
make deploy-full

# 個別実行
make docker-build    # Dockerイメージをビルド
make docker-push     # GCRにプッシュ
make deploy          # Cloud Runにデプロイ
```

**手動デプロイ**:

```bash
# Dockerイメージをビルド
docker build -t gcr.io/rock-terra-482808-m7/daily-report:latest .

# GCRにプッシュ
docker push gcr.io/rock-terra-482808-m7/daily-report:latest

# Cloud Runにデプロイ
gcloud run deploy daily-report \
  --image gcr.io/rock-terra-482808-m7/daily-report:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

**CI/CD（自動デプロイ）**:

`main` ブランチにプッシュすると、GitHub Actionsが自動的にCloud Runにデプロイします。

詳細は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) を参照してください。

## 📄 ライセンス

Private
