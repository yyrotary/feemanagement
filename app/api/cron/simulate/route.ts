import { NextResponse } from 'next/server';

/**
 * GET 요청 처리 - cron job 시뮬레이션 실행
 * 
 * 다음 매개변수를 쿼리스트링으로 받을 수 있습니다:
 * - forceUpdate: true 설정 시 마지막 실행 시간 확인 없이 강제 실행
 * - sinceHours: 특정 시간(시간 단위) 이전부터의 거래내역만 가져오기
 * - sinceDays: 특정 날짜(일 단위) 이전부터의 거래내역만 가져오기
 * - debug: true 설정 시 추가 디버깅 정보 출력
 */
export async function GET(request: Request) {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron 시뮬레이션 시작: 수동 요청`);
    
    // URL 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const forceUpdate = searchParams.get('forceUpdate') === 'true';
    const sinceHours = searchParams.get('sinceHours') ? parseInt(searchParams.get('sinceHours')!) : null;
    const sinceDays = searchParams.get('sinceDays') ? parseInt(searchParams.get('sinceDays')!) : null;
    const debug = searchParams.get('debug') === 'true';
    
    // 디버그 로그
    if (debug) {
      console.log('시뮬레이션 매개변수:');
      console.log(`- forceUpdate: ${forceUpdate}`);
      console.log(`- sinceHours: ${sinceHours}`);
      console.log(`- sinceDays: ${sinceDays}`);
      console.log(`- debug: ${debug}`);
    }
    
    // 타임스탬프 계산
    let sinceDate: Date | null = null;
    
    if (sinceHours !== null && !isNaN(sinceHours)) {
      sinceDate = new Date(now.getTime() - sinceHours * 60 * 60 * 1000);
      console.log(`${sinceHours}시간 전부터의 거래내역 가져오기: ${sinceDate.toISOString()}`);
    } else if (sinceDays !== null && !isNaN(sinceDays)) {
      sinceDate = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
      console.log(`${sinceDays}일 전부터의 거래내역 가져오기: ${sinceDate.toISOString()}`);
    }
    
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // URL 및 매개변수 구성
    let updateApiUrl = `${baseUrl}/api/updateTransactions`;
    const urlParams = new URLSearchParams();
    
    if (sinceDate) {
      urlParams.append('sinceDate', sinceDate.toISOString());
    }
    
    if (forceUpdate) {
      urlParams.append('forceUpdate', 'true');
    }
    
    // URL에 매개변수 추가
    if (urlParams.toString()) {
      updateApiUrl += `?${urlParams.toString()}`;
    }
    
    console.log(`[${now.toISOString()}] API 호출 중: ${updateApiUrl}`);
    
    const response = await fetch(updateApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 응답 처리
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error(`[${now.toISOString()}] API 호출 실패:`, responseData);
      return NextResponse.json(
        { 
          error: responseData.error || response.statusText,
          status: 'error',
          time: now.toISOString()
        }, 
        { status: response.status }
      );
    }
    
    console.log(`[${now.toISOString()}] 거래내역 업데이트 완료:`, JSON.stringify(responseData, null, 2));
    
    return NextResponse.json({
      status: 'success',
      time: now.toISOString(),
      simulationParams: {
        forceUpdate,
        sinceHours,
        sinceDays,
        debug
      },
      result: responseData
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron 시뮬레이션 오류:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '시뮬레이션을 실행할 수 없습니다.',
        status: 'error',
        time: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 