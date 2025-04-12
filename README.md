# 회비 관리 시스템

## Cloudtype Docker 배포 안내

이 프로젝트는 Puppeteer가 포함된 Next.js 애플리케이션으로, Cloudtype에 Docker 방식으로 배포하도록 구성되어 있습니다.

### 배포 전 준비사항

1. Cloudtype 계정 및 프로젝트 생성
2. GitHub 저장소 연결

### 배포 방법

1. 의존성 설치 및 브라우저 설치

```bash
# 의존성 설치
npm install

# Puppeteer 브라우저 설치
npm run install-browsers
```

2. GitHub에 코드 Push

```bash
git add .
git commit -m "Docker 배포 설정 추가"
git push
```

3. Cloudtype 콘솔에서 배포 설정

- 새 배포 > GitHub 저장소 선택 > Docker 배포 방식 선택
- 포트는 3000으로 설정
- 환경 변수 설정 (필요한 경우)

4. 배포 시작

### 주요 파일 설명

- `Dockerfile`: Puppeteer를 포함한 Docker 환경 구성
- `.cloudtype.yaml`: Cloudtype 배포 설정
- `puppeteer.config.cjs`: Puppeteer 설정 및 캐시 디렉토리 지정
- `.cache/puppeteer`: Puppeteer 브라우저 캐시 디렉토리

### 환경 변수 설정

Cloudtype 콘솔에서 다음 환경 변수를 설정해야 합니다:

```
NODE_ENV=production
PUPPETEER_EXECUTABLE_PATH=/app/.cache/puppeteer/chrome/linux-122.0.6261.69/chrome-linux64/chrome
PUPPETEER_CACHE_DIR=./.cache/puppeteer
```

### 로컬 개발 환경 설정

로컬에서 Puppeteer를 사용하기 위해:

```bash
# puppeteer 브라우저 설치
npm run install-browsers
```

## 트러블슈팅

### Puppeteer 관련 오류

Chrome 실행 오류가 발생하면:

1. Docker 내 필요한 라이브러리가 설치되었는지 확인
2. Puppeteer 브라우저가 정상적으로 설치되었는지 확인
3. 환경 변수가 올바르게 설정되었는지 확인
4. Linux 환경에서 Chrome 경로가 올바른지 확인 (/app/.cache/puppeteer/chrome/linux-122.0.6261.69/chrome-linux64/chrome)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
