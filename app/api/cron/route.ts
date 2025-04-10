import { NextResponse } from 'next/server';

/**
 * GET 요청 처리 - cron job 실행 
 * 누구나 이 엔드포인트를 호출할 수 있으며, 주기적인 거래내역 업데이트를 수행합니다.
 */
export async function GET(request: Request) {
  try {
    // 현재 시간 기록
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron job 실행 시작`);
    
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const updateApiUrl = new URL('/api/updateTransactions', baseUrl);
    
    console.log(`[${now.toISOString()}] API 호출 중: ${updateApiUrl}`);
    
    const response = await fetch(updateApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`거래내역 업데이트 API 호출 실패: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      status: 'success',
      message: '거래내역 업데이트 cron 작업 완료',
      result,
      executedAt: now.toISOString()
    });
    
  } catch (error) {
    console.error('Cron 작업 실행 중 오류 발생:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: 'Cron 작업 실행 중 오류 발생', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 