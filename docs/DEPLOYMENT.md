# デプロイガイド

このドキュメントでは、日報管理システムをGoogle Cloud Runにデプロイする手順を説明します。

## 前提条件

- Google Cloud Platform (GCP) アカウント
- `gcloud` CLI のインストール
- Docker のインストール
- プロジェクトID: `rock-terra-482808-m7`

## 初回セットアップ

### 1. Google Cloud の設定

```bash
# Google Cloudにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project rock-terra-482808-m7

# 必要なAPIを有効化
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com
```

### 2. Docker認証の設定

```bash
# Docker認証を設定
make gcloud-configure-docker

# または直接コマンドを実行
gcloud auth configure-docker
```

### 3. Secret Managerの設定

データベース接続情報などの機密情報をSecret Managerに保存します：

```bash
# Makefileを使用
make set-secret

# または直接コマンドを実行
echo -n "postgresql://user:password@host:5432/db" | \
  gcloud secrets create DATABASE_URL \
    --data-file=- \
    --replication-policy="automatic"
```

### 4. サービスアカウントの作成（CI/CD用）

GitHub Actionsからデプロイするためのサービスアカウントを作成：

```bash
# サービスアカウントを作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# 必要な権限を付与
gcloud projects add-iam-policy-binding rock-terra-482808-m7 \
  --member="serviceAccount:github-actions@rock-terra-482808-m7.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding rock-terra-482808-m7 \
  --member="serviceAccount:github-actions@rock-terra-482808-m7.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding rock-terra-482808-m7 \
  --member="serviceAccount:github-actions@rock-terra-482808-m7.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# キーファイルを作成
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@rock-terra-482808-m7.iam.gserviceaccount.com
```

作成された `key.json` の内容を GitHub Secrets に `GCP_SA_KEY` として登録してください。

## ローカルでのデプロイ

### Makefileを使用したデプロイ

```bash
# ヘルプを表示
make help

# Dockerイメージをビルド
make docker-build

# Dockerイメージをプッシュ
make docker-push

# Cloud Runにデプロイ
make deploy

# 一括実行（ビルド → プッシュ → デプロイ）
make deploy-full
```

### 手動デプロイ

```bash
# 1. Dockerイメージをビルド
docker build -t gcr.io/rock-terra-482808-m7/daily-report:latest .

# 2. GCRにプッシュ
docker push gcr.io/rock-terra-482808-m7/daily-report:latest

# 3. Cloud Runにデプロイ
gcloud run deploy daily-report \
  --image gcr.io/rock-terra-482808-m7/daily-report:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest
```

## CI/CDによる自動デプロイ

### GitHub Actionsの設定

1. **GitHub Secretsの設定**

GitHubリポジトリの Settings → Secrets and variables → Actions から以下を設定：

- `GCP_SA_KEY`: サービスアカウントのJSONキー（key.jsonの内容）

2. **デプロイワークフロー**

`.github/workflows/deploy.yml` が設定済みです。

`main` ブランチにプッシュすると自動的にデプロイされます：

```bash
git add .
git commit -m "feat: 新機能を追加"
git push origin main
```

手動でデプロイを実行する場合：

```bash
# GitHub ActionsのUIから "Deploy to Cloud Run" ワークフローを手動実行
```

## デプロイ後の確認

### サービス情報の確認

```bash
# サービス情報を表示
make describe

# または直接コマンドを実行
gcloud run services describe daily-report \
  --region asia-northeast1
```

### ログの確認

```bash
# ログを表示
make logs

# または直接コマンドを実行
gcloud run services logs read daily-report \
  --region asia-northeast1 \
  --limit 50
```

### URLの確認

```bash
# サービスURLを取得
gcloud run services describe daily-report \
  --platform managed \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

## データベースのセットアップ

### Cloud SQL（推奨）

```bash
# Cloud SQLインスタンスを作成
gcloud sql instances create daily-report-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1

# データベースを作成
gcloud sql databases create daily_report \
  --instance=daily-report-db

# ユーザーを作成
gcloud sql users create daily_report_user \
  --instance=daily-report-db \
  --password=YOUR_PASSWORD

# Cloud Runからの接続を許可
gcloud run services update daily-report \
  --add-cloudsql-instances rock-terra-482808-m7:asia-northeast1:daily-report-db
```

### マイグレーションの実行

```bash
# Cloud Run Jobsを使用してマイグレーションを実行（推奨）
gcloud run jobs create migrate-db \
  --image gcr.io/rock-terra-482808-m7/daily-report:latest \
  --region asia-northeast1 \
  --command "npx" \
  --args "prisma,migrate,deploy" \
  --set-secrets DATABASE_URL=DATABASE_URL:latest

gcloud run jobs execute migrate-db --region asia-northeast1
```

## トラブルシューティング

### ビルドエラー

```bash
# ローカルでDockerビルドをテスト
make docker-build
make docker-run
```

### デプロイエラー

```bash
# ログを確認
make logs

# サービスステータスを確認
make describe
```

### データベース接続エラー

```bash
# シークレットが正しく設定されているか確認
gcloud secrets versions access latest --secret="DATABASE_URL"

# Cloud SQL接続を確認
gcloud sql instances describe daily-report-db
```

## パフォーマンスチューニング

### Cloud Runの設定調整

```bash
# より高いメモリとCPUを設定
gcloud run services update daily-report \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 100
```

### オートスケーリング設定

```bash
# リクエスト数に応じたスケーリング
gcloud run services update daily-report \
  --concurrency 80 \
  --max-instances 10
```

## コスト最適化

- **最小インスタンス数を0に設定**: アクセスがない時はインスタンスをゼロに
- **適切なメモリサイズ**: 512MBから開始し、必要に応じて調整
- **Cloud SQLの tier**: 開発環境では `db-f1-micro` を使用

## セキュリティ

- 認証が必要な場合は `--no-allow-unauthenticated` を使用
- IAMで適切なアクセス制御を設定
- Secret Managerで機密情報を管理
- 定期的にセキュリティアップデートを適用

## 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
