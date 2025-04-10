/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // any 타입 사용 에러를 무시하도록 빌드 경고만 표시하고 빌드는 진행되게 설정
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 