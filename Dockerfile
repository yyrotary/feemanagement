FROM node:20-slim AS base

# 1. Puppeteer 실행에 필요한 의존성 설치
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 기본 작업 디렉토리 설정
WORKDIR /app

# 2. 종속성 설치
COPY package.json ./
RUN npm install

# 3. 소스 코드 복사
COPY . .

# 4. .cache 디렉토리 설정 및 권한 설정
RUN mkdir -p /app/.cache/puppeteer
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
RUN chmod -R 777 /app/.cache

RUN mkdir -p /app/temp /app/debug
RUN chmod -R 777 /app/temp /app/debug

# 5. Puppeteer 브라우저 설치
RUN npx puppeteer browsers install chrome

# 6. Next.js 애플리케이션 빌드
RUN npm run build

# 7. 실행 설정
ENV PORT=3000
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/app/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

EXPOSE 3000

CMD ["npm", "start"] 