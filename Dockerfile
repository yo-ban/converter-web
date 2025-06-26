FROM mcr.microsoft.com/playwright:v1.53.1-noble

# 日本語フォントとロケール設定
RUN apt-get update && apt-get install -y \
    fonts-noto \
    language-pack-ja \
    && apt-get purge -y 'fonts-wqy-*' \
    && apt-get purge -y '?and(?name(^fonts-),?not(?name(^fonts-noto)))' \
    && rm -rf /var/lib/apt/lists/* \
    && locale-gen ja_JP.UTF-8

# フォントキャッシュを更新
RUN fc-cache -fv

ENV LANG=ja_JP.UTF-8
ENV LC_ALL=ja_JP.UTF-8

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# アプリケーションファイルをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]