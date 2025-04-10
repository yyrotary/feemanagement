import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// 배포 환경에 따른 리다이렉트 URI 설정
const getRedirectUri = () => {
  // 개발 환경과 프로덕션 환경 구분
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 프로덕션 환경에서는 실제 도메인 사용
  if (isProduction) {
    return 'https://yyrotary.vercel.app/api/oauth/callback';
  }
  
  // 개발 환경에서는 localhost 사용
  return 'http://localhost:3000/api/oauth/callback';
};

const REDIRECT_URI = getRedirectUri();
console.log('REDIRECT_URI:', REDIRECT_URI);

// 인증 URL 생성 함수
async function getAuthUrl() {
  try {
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
    
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      include_granted_scopes: true,
      // Google Cloud 콘솔에서 설정한 테스트 사용자(개발자 본인 계정)만 접근할 수 있도록 설정
      login_hint: 'yyrotary@gmail.com'
    });
    
    return { authUrl, oAuth2Client };
  } catch (error) {
    console.error('인증 URL 생성 오류:', error);
    throw error;
  }
}

// 인증 정보 저장 함수
async function saveCredentials(client: OAuth2Client) {
  try {
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
    
    // 환경에 따른 저장 방식 선택
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // 프로덕션 환경: 환경 변수 사용 안내
      console.log('인증 정보를 환경 변수 GOOGLE_TOKEN에 저장해야 합니다:');
      console.log(payload);
      console.log('Vercel 대시보드에서 환경 변수 GOOGLE_TOKEN에 위 값을 설정하세요.');
    } else {
      // 개발 환경: 파일로 저장
      fs.writeFileSync(TOKEN_PATH, payload);
      console.log(`로컬 개발 환경: 인증 정보가 파일에 저장되었습니다: ${TOKEN_PATH}`);
      
      // 환경 변수에도 임시 저장 (개발 환경용)
      process.env.GOOGLE_TOKEN = payload;
      console.log('개발 환경 변수 GOOGLE_TOKEN에도 저장되었습니다.');
    }
  } catch (err) {
    console.error('인증 정보 저장 오류:', err);
    throw new Error('인증 정보를 저장할 수 없습니다.');
  }
}

// 인증 URL 제공 API
export async function GET() {
  try {
    const { authUrl } = await getAuthUrl();
    console.log('생성된 인증 URL:', authUrl); // 디버깅용
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('OAuth URL 생성 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '인증 URL을 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// 콜백 처리 API
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const code = data.code;
    console.log('인증 코드:', code);
    
    if (!code) {
      return NextResponse.json(
        { error: '인증 코드가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }
    
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
    
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    await saveCredentials(oAuth2Client);
    
    return NextResponse.json({ 
      message: 'Gmail API 인증이 완료되었습니다.', 
      success: true 
    });
  } catch (error) {
    console.error('OAuth 콜백 처리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OAuth 인증에 실패했습니다.' },
      { status: 500 }
    );
  }
} 