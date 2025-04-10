import { NextResponse } from 'next/server';

// cron-job.org에서 설정한 비밀 키를 확인하는 상수
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET 요청 처리 - cron job 실행 
 */
export async function GET(request: Request) {
  try {
    // 현재 시간 기록
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron job 실행 시작`);
    
    
    
    // 마지막 실행 시간 기록 (선택 사항)
    const lastRunTime = now;
    
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
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
      lastRun: lastRunTime.toISOString(),
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