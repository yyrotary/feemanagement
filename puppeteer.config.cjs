/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // Docker와 로컬 개발 환경 모두에서 작동하도록 설정
  cacheDirectory: process.env.PUPPETEER_CACHE_DIR || './.cache/puppeteer',
  // Docker 환경에서 필요한 옵션 추가
  browserRevision: 'latest',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  // 자동 다운로드 설정
  skipDownload: false,
  // puppeteer 7.0.0+ 사용 시 필요한 설정
  browsers: [
    { name: 'chrome', revision: 'latest' }
  ]
}; 