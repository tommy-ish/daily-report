# 変数定義
PROJECT_ID = rock-terra-482808-m7
REGION = asia-northeast1
SERVICE_NAME = daily-report
IMAGE_NAME = gcr.io/$(PROJECT_ID)/$(SERVICE_NAME)
PORT = 8080

# カラー出力用
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

.PHONY: help
help: ## このヘルプを表示
	@echo "$(GREEN)利用可能なコマンド:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

.PHONY: setup
setup: ## 初期セットアップ
	@echo "$(GREEN)初期セットアップを開始...$(NC)"
	npm install --legacy-peer-deps
	cp .env.example .env
	@echo "$(YELLOW).envファイルを編集してください$(NC)"

.PHONY: dev
dev: ## 開発サーバーを起動
	npm run dev

.PHONY: build
build: ## プロダクションビルド
	npm run build

.PHONY: test
test: ## テストを実行
	npm test

.PHONY: lint
lint: ## Lintを実行
	npm run lint

.PHONY: format
format: ## コードフォーマット
	npm run format

.PHONY: prisma-generate
prisma-generate: ## Prismaクライアントを生成
	npm run prisma:generate

.PHONY: prisma-migrate
prisma-migrate: ## マイグレーションを実行
	npm run prisma:migrate

.PHONY: prisma-studio
prisma-studio: ## Prisma Studioを起動
	npm run prisma:studio

.PHONY: docker-build
docker-build: ## Dockerイメージをビルド
	@echo "$(GREEN)Dockerイメージをビルド中...$(NC)"
	docker build -t $(IMAGE_NAME):latest .

.PHONY: docker-run
docker-run: ## Dockerコンテナをローカルで実行
	@echo "$(GREEN)Dockerコンテナを起動中...$(NC)"
	docker run -p $(PORT):$(PORT) \
		-e DATABASE_URL="$(DATABASE_URL)" \
		-e NODE_ENV=production \
		$(IMAGE_NAME):latest

.PHONY: docker-push
docker-push: ## DockerイメージをGCRにプッシュ
	@echo "$(GREEN)Dockerイメージをプッシュ中...$(NC)"
	docker push $(IMAGE_NAME):latest

.PHONY: gcloud-auth
gcloud-auth: ## Google Cloudに認証
	@echo "$(GREEN)Google Cloudに認証中...$(NC)"
	gcloud auth login
	gcloud config set project $(PROJECT_ID)

.PHONY: gcloud-configure-docker
gcloud-configure-docker: ## Docker認証を設定
	@echo "$(GREEN)Docker認証を設定中...$(NC)"
	gcloud auth configure-docker

.PHONY: deploy
deploy: ## Cloud Runにデプロイ
	@echo "$(GREEN)Cloud Runにデプロイ中...$(NC)"
	gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_NAME):latest \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated \
		--port $(PORT) \
		--memory 512Mi \
		--cpu 1 \
		--min-instances 0 \
		--max-instances 10 \
		--set-env-vars NODE_ENV=production \
		--set-secrets DATABASE_URL=DATABASE_URL:latest \
		--project $(PROJECT_ID)

.PHONY: deploy-full
deploy-full: docker-build docker-push deploy ## ビルド、プッシュ、デプロイを一括実行
	@echo "$(GREEN)デプロイが完了しました!$(NC)"

.PHONY: logs
logs: ## Cloud Runのログを表示
	gcloud run services logs read $(SERVICE_NAME) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--limit 50

.PHONY: describe
describe: ## サービス情報を表示
	gcloud run services describe $(SERVICE_NAME) \
		--region $(REGION) \
		--project $(PROJECT_ID)

.PHONY: set-secret
set-secret: ## Secret Managerにシークレットを設定
	@echo "$(GREEN)シークレットを設定中...$(NC)"
	@read -p "DATABASE_URL: " db_url; \
	echo -n "$$db_url" | gcloud secrets create DATABASE_URL \
		--data-file=- \
		--replication-policy="automatic" \
		--project $(PROJECT_ID) || \
	echo -n "$$db_url" | gcloud secrets versions add DATABASE_URL \
		--data-file=- \
		--project $(PROJECT_ID)

.PHONY: clean
clean: ## ビルド成果物を削除
	rm -rf .next
	rm -rf node_modules
	rm -rf coverage
	rm -rf dist
	rm -rf build

.PHONY: ci-test
ci-test: ## CI環境でテストを実行
	npm ci --legacy-peer-deps
	npm run lint
	npm run type-check
	npm run test:coverage
