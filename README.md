# Convertly

シンプルなファイル変換ツール。SVGを画像に、MarkdownをPDFに変換できます。

## 機能

- **SVG → PNG/JPEG変換**: 解像度とフォーマットを指定可能
- **Markdown → PDF変換**: ページサイズをカスタマイズ可能
- 日本語・絵文字対応
- リアルタイムプレビュー

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd converter-web
```

2. 依存関係をインストール
```bash
npm install
```

3. Playwrightのブラウザをインストール
```bash
npx playwright install chromium
```

4. 日本語フォントのインストール（Ubuntu/Debian）
```bash
# Noto Sans JPフォントをインストール
sudo apt-get update
sudo apt-get install -y fonts-noto-cjk

# フォントキャッシュを更新
fc-cache -fv
```

macOSの場合：
```bash
# Homebrewを使用
brew tap homebrew/cask-fonts
brew install --cask font-noto-sans-cjk-jp
```

5. 開発サーバーを起動
```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## ビルドとデプロイ

### プロダクションビルド
```bash
npm run build
npm start
```

### Dockerを使用する場合

Dockerfileの例：
```dockerfile
FROM node:18-alpine

# 日本語フォントのインストール
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 環境変数

特別な環境変数は不要です。

## トラブルシューティング

### 日本語が表示されない場合

1. フォントが正しくインストールされているか確認
```bash
fc-list | grep -i noto
```

2. Playwrightのブラウザを再インストール
```bash
npx playwright install --force chromium
```

### 変換エラーが発生する場合

- ファイルサイズ制限: SVG 10MB以下、Markdown 5MB以下
- メモリ不足の場合はNode.jsのメモリ制限を増やす
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## ライセンス

MIT