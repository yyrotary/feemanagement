import { NextResponse } from 'next/server';

// cron job의 마지막 실행 시간 추적을 위한 전역 변수
let lastRunTime: Date | null = null;

/**
 * GET 요청 처리 - cron job 상태 정보 반환
 */
export async function GET() {
  try {
    const now = new Date();
    
    return NextResponse.json({
      lastRun: lastRunTime ? lastRunTime.toISOString() : null,
      currentTime: now.toISOString(),
      nextRunTime: lastRunTime ? new Date(lastRunTime.getTime() + 2 * 60 * 1000).toISOString() : now.toISOString(),
      status: 'active',
    });
  } catch (error) {
    console.error('Cron 상태 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron 상태를 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST 요청 처리 - cron job 실행 
 * Vercel의 cron 설정으로 이 엔드포인트가 2분마다 호출됨
 */
export async function POST() {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron 작업 시작: 최신 거래내역 업데이트`);
    
    // 마지막 실행 시간 확인 (최소 2분 간격 유지)
    if (lastRunTime && now.getTime() - lastRunTime.getTime() < 2 * 60 * 1000) {
      console.log(`마지막 실행(${lastRunTime.toISOString()})으로부터 2분이 경과하지 않았습니다. 건너뜁니다.`);
      return NextResponse.json({
        status: 'skipped',
        message: '마지막 실행으로부터 2분이 경과하지 않았습니다.',
        lastRun: lastRunTime.toISOString(),
        currentTime: now.toISOString()
      });
    }
    
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const updateApiUrl = `${baseUrl}/api/updateTransactions`;
    
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
    console.log(`[${now.toISOString()}] 거래내역 업데이트 완료:`, JSON.stringify(result, null, 2));
    
    // 마지막 실행 시간 업데이트
    lastRunTime = now;
    
    return NextResponse.json({
      status: 'success',
      time: now.toISOString(),
      result
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron 작업 오류:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron 작업을 실행할 수 없습니다.' },
      { status: 500 }
    );
  }
} 