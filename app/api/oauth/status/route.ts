import { NextResponse } from 'next/server';

// 인증 상태 조회 API
export async function GET() {
  try {
    // 환경 변수에서 토큰 확인
    const token = process.env.GOOGLE_TOKEN;
    const isAuthenticated = Boolean(token);
    
    // 토큰이 있으면 내용도 확인
    let tokenValid = false;
    
    if (isAuthenticated) {
      try {
        const tokenObj = JSON.parse(token!);
        
        // 최소한의 필수 필드가 있는지 확인
        tokenValid = Boolean(
          tokenObj.type === 'authorized_user' && 
          tokenObj.client_id && 
          tokenObj.client_secret && 
          tokenObj.refresh_token
        );
      } catch (err) {
        console.error('토큰 파싱 오류:', err);
        tokenValid = false;
      }
    }
    
    return NextResponse.json({ 
      isAuthenticated: isAuthenticated && tokenValid,
      tokenSource: process.env.NODE_ENV === 'production' ? 'environment' : 'environment or memory'
    });
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    return NextResponse.json({ 
      isAuthenticated: false,
      error: error instanceof Error ? error.message : '인증 상태를 확인할 수 없습니다.'
    }, { status: 500 });
  }
} 