import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// 배포 환경에 따른 리다이렉트 URI 설정
const getRedirectUri = () => {
  // 개발 환경과 프로덕션 환경 구분
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 프로덕션 환경에서는 실제 도메인 사용
  if (isProduction) {
    console.log('production 환경입니다.');
    return 'https://yyrotary.vercel.app/api/oauth/callback';
  }
  
  // 개발 환경에서는 localhost 사용
  console.log('development 환경입니다.');
  return 'http://localhost:3000/api/oauth/callback';
};

const REDIRECT_URI = getRedirectUri();

// 인증 정보 저장 함수
async function saveCredentials(client: OAuth2Client) {
  try {
    // 환경 변수에서 인증 정보 가져오기
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
    }
    
    const keys = JSON.parse(credentials);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    
    // 환경 변수에 저장하는 대신 콘솔에 출력 (실제로는 Vercel 환경 변수에 설정해야 함)
    console.log('인증 정보를 환경 변수 GOOGLE_TOKEN에 저장해야 합니다:');
    console.log(payload);
    console.log('Vercel 대시보드에서 환경 변수 GOOGLE_TOKEN에 위 값을 설정하세요.');
    
    // 개발 환경에서만 임시로 메모리에 저장
    if (process.env.NODE_ENV !== 'production') {
      process.env.GOOGLE_TOKEN = payload;
    }
  } catch (err) {
    console.error('인증 정보 저장 오류:', err);
    throw new Error('인증 정보를 저장할 수 없습니다.');
  }
}

// OAuth 콜백 처리 - GET 요청
export async function GET(request: Request) {
  try {
    console.log('OAuth 콜백 요청 수신:', request.url);
    
    // URL에서 인증 코드 추출
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return new Response('인증 코드가 제공되지 않았습니다.', { 
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }
    
    console.log('인증 코드 수신 성공');
    
    // 환경 변수에서 인증 정보 가져오기
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
    }
    
    const keys = JSON.parse(credentials);
    const key = keys.installed || keys.web;
    
    const oAuth2Client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      REDIRECT_URI
    );
    
    console.log('토큰 교환 시도 중...');
    
    // 토큰 가져오기
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    console.log('토큰 교환 성공, 인증 정보 저장 중...');
    
    // 인증 정보 저장
    await saveCredentials(oAuth2Client);
    
    console.log('인증 정보 저장 완료');
    
    // HTML 응답으로 성공 메시지 표시
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gmail API 인증 완료</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f5f5f5;
            margin: 0;
          }
          .container {
            text-align: center;
            background-color: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          h1 {
            color: #0051A1;
            margin-bottom: 1rem;
          }
          p {
            color: #333;
            line-height: 1.6;
          }
          .success-icon {
            font-size: 4rem;
            color: #34A853;
            margin-bottom: 1rem;
          }
          .btn {
            display: inline-block;
            background-color: #0051A1;
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 1rem;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Gmail API 인증이 완료되었습니다</h1>
          <p>
            YY 로타리 회비관리 시스템과 Gmail API 연동이 성공적으로 완료되었습니다.
            이제 거래내역 동기화 기능을 사용할 수 있습니다.
          </p>
          <a href="/admin/transactions" class="btn">거래내역 페이지로 이동</a>
        </div>
      </body>
    </html>
    `;
    
    return new Response(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('OAuth 콜백 처리 오류:', error);
    
    // HTML 에러 메시지
    const errorMessage = error instanceof Error ? error.message : 'OAuth 인증에 실패했습니다.';
    const htmlError = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gmail API 인증 실패</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f5f5f5;
            margin: 0;
          }
          .container {
            text-align: center;
            background-color: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          h1 {
            color: #EA4335;
            margin-bottom: 1rem;
          }
          p {
            color: #333;
            line-height: 1.6;
          }
          .error-icon {
            font-size: 4rem;
            color: #EA4335;
            margin-bottom: 1rem;
          }
          .error-message {
            background-color: #FFECEC;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
            word-break: break-word;
          }
          .btn {
            display: inline-block;
            background-color: #666;
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 1rem;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Gmail API 인증 실패</h1>
          <p>
            인증 과정에서 오류가 발생했습니다:
          </p>
          <div class="error-message">
            ${errorMessage}
          </div>
          <a href="/admin/transactions" class="btn">거래내역 페이지로 돌아가기</a>
        </div>
      </body>
    </html>
    `;
    
    return new Response(htmlError, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
} 