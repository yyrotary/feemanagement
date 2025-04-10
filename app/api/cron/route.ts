import { NextResponse } from 'next/server';

/**
 * POST 요청 처리 - cron job 실행 
 */
export async function POST() {
  try {
    const now = new Date();
    console.log(`Cron 작업 시작`);
 
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
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