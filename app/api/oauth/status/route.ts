import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// 인증 상태 조회 API
export async function GET() {
  try {
    // 토큰 파일 존재 여부 확인
    const isAuthenticated = fs.existsSync(TOKEN_PATH);
    
    // 토큰 파일이 있으면 내용도 확인
    let tokenValid = false;
    
    if (isAuthenticated) {
      try {
        const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
        const token = JSON.parse(content);
        
        // 최소한의 필수 필드가 있는지 확인
        tokenValid = Boolean(
          token.type === 'authorized_user' && 
          token.client_id && 
          token.client_secret && 
          token.refresh_token
        );
      } catch (err) {
        console.error('토큰 파일 읽기 오류:', err);
        tokenValid = false;
      }
    }
    
    return NextResponse.json({ 
      isAuthenticated: isAuthenticated && tokenValid,
      lastUpdated: isAuthenticated ? fs.statSync(TOKEN_PATH).mtime : null
    });
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    return NextResponse.json({ 
      isAuthenticated: false,
      error: error instanceof Error ? error.message : '인증 상태를 확인할 수 없습니다.'
    }, { status: 500 });
  }
} 