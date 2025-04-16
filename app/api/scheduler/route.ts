import { NextResponse } from 'next/server';

// 스케줄러 작업 상태
let schedulerStarted = false;
let schedulerIntervals: NodeJS.Timeout[] = [];
let lastExecutions: Record<string, Date> = {};

// 스케줄러 설정
interface SchedulerConfig {
  dailyIntervalMinutes: number;
  weeklyIntervalDays: number;
}

let schedulerConfig: SchedulerConfig = {
  dailyIntervalMinutes: 5, // 기본값: 5분
  weeklyIntervalDays: 2     // 기본값: 2일
};

// 스케줄러 설정 저장
function saveConfig() {
  if (typeof global !== 'undefined' && global.localStorage) {
    try {
      global.localStorage.setItem('schedulerConfig', JSON.stringify(schedulerConfig));
    } catch (error) {
      console.error('스케줄러 설정 저장 실패:', error);
    }
  }
}

// 스케줄러 설정 로드
function loadConfig() {
  if (typeof global !== 'undefined' && global.localStorage) {
    try {
      const savedConfig = global.localStorage.getItem('schedulerConfig');
      if (savedConfig) {
        schedulerConfig = JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('스케줄러 설정 로드 실패:', error);
    }
  }
}

// 초기 설정 로드
loadConfig();

// 거래내역 업데이트 함수
async function supdateTransactions(forceUpdate: boolean = false) {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] 거래내역 업데이트 작업 실행 중...`);
    
    // updateTransactions API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const url = new URL('/api/updateTransactions', baseUrl);
    
    // 강제 업데이트인 경우 매개변수 추가
    if (forceUpdate) {
      url.searchParams.append('forceUpdate', 'true');
    }
    
    const updateApiUrl = url.toString();
    console.log(`API 호출: ${updateApiUrl}`);
    
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
    console.log(`[${now.toISOString()}] 거래내역 업데이트 완료:`, result);
    
    // 마지막 실행 시간 업데이트
    lastExecutions[forceUpdate ? 'weeklyUpdate' : 'dailyUpdate'] = now;
    
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 거래내역 업데이트 오류:`, error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : '거래내역 업데이트 실패'
    };
  }
}

// 스케줄러 시작 함수
function startScheduler() {
  if (schedulerStarted) {
    console.log('스케줄러가 이미 실행 중입니다.');
    return;
  }
  
  // 기존 인터벌 정리
  stopScheduler();
  
  console.log(`거래내역 자동 업데이트 스케줄러 시작 (일일 간격: ${schedulerConfig.dailyIntervalMinutes}분, 주간 간격: ${schedulerConfig.weeklyIntervalDays}일)`);
  
  // 일일 업데이트
  const dailyIntervalMs = schedulerConfig.dailyIntervalMinutes * 60 * 1000;
  schedulerIntervals.push(
    setInterval(() => {
      supdateTransactions(false);
    }, dailyIntervalMs)
  );
  
  // 주간 전체 업데이트
  const weeklyIntervalMs = schedulerConfig.weeklyIntervalDays * 24 * 60 * 60 * 1000;
  schedulerIntervals.push(
    setInterval(() => {
      supdateTransactions(true);
    }, weeklyIntervalMs)
  );
  
  // 서버 시작 시 초기 실행
  supdateTransactions(false);
  
  schedulerStarted = true;
}

// 스케줄러 중지 함수
function stopScheduler() {
  schedulerIntervals.forEach(interval => clearInterval(interval));
  schedulerIntervals = [];
  schedulerStarted = false;
  console.log('거래내역 자동 업데이트 스케줄러 중지');
}

// 스케줄러 설정 업데이트 함수
function updateSchedulerConfig(newConfig: Partial<SchedulerConfig>) {
  // 최소값 검증
  if (newConfig.dailyIntervalMinutes !== undefined) {
    schedulerConfig.dailyIntervalMinutes = Math.max(1, newConfig.dailyIntervalMinutes);
  }
  
  if (newConfig.weeklyIntervalDays !== undefined) {
    schedulerConfig.weeklyIntervalDays = Math.max(1, newConfig.weeklyIntervalDays);
  }
  
  // 설정 저장
  saveConfig();
  
  // 이미 실행 중이면 재시작
  if (schedulerStarted) {
    stopScheduler();
    startScheduler();
  }
  
  return schedulerConfig;
}

// 앱 시작 시 스케줄러 자동 시작
if (typeof global !== 'undefined' && !schedulerStarted) {
  console.log('서버 실행과 함께 스케줄러 자동 시작');
  startScheduler();
}

// GET: 스케줄러 상태 확인
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'success',
    schedulerRunning: schedulerStarted,
    lastExecutions,
    intervals: schedulerIntervals.length,
    config: schedulerConfig
  });
}

// POST: 스케줄러 제어 및 즉시 실행
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';
    const forceUpdate = url.searchParams.get('forceUpdate') === 'true';
    
    // 추가 설정 파라미터
    const dailyIntervalMinutes = url.searchParams.get('dailyIntervalMinutes');
    const weeklyIntervalDays = url.searchParams.get('weeklyIntervalDays');
    
    switch (action) {
      case 'start':
        startScheduler();
        return NextResponse.json({
          status: 'success',
          message: '스케줄러가 시작되었습니다.',
          schedulerRunning: schedulerStarted,
          config: schedulerConfig
        });
        
      case 'stop':
        stopScheduler();
        return NextResponse.json({
          status: 'success',
          message: '스케줄러가 중지되었습니다.',
          schedulerRunning: schedulerStarted,
          config: schedulerConfig
        });
        
      case 'restart':
        stopScheduler();
        startScheduler();
        return NextResponse.json({
          status: 'success',
          message: '스케줄러가 재시작되었습니다.',
          schedulerRunning: schedulerStarted,
          config: schedulerConfig
        });
        
      case 'execute':
        // 즉시 실행
        const result = await supdateTransactions(forceUpdate);
        return NextResponse.json({
          status: 'success',
          message: '거래내역 업데이트가 실행되었습니다.',
          forceUpdate,
          result,
          config: schedulerConfig
        });
        
      case 'config':
        // 설정 업데이트
        const newConfig: Partial<SchedulerConfig> = {};
        
        if (dailyIntervalMinutes) {
          newConfig.dailyIntervalMinutes = parseInt(dailyIntervalMinutes, 10);
        }
        
        if (weeklyIntervalDays) {
          newConfig.weeklyIntervalDays = parseInt(weeklyIntervalDays, 10);
        }
        
        const updatedConfig = updateSchedulerConfig(newConfig);
        
        return NextResponse.json({
          status: 'success',
          message: '스케줄러 설정이 업데이트되었습니다.',
          config: updatedConfig,
          schedulerRunning: schedulerStarted
        });
        
      default:
        return NextResponse.json({
          status: 'error', 
          message: '유효하지 않은 작업입니다. action 매개변수를 확인하세요.'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('스케줄러 API 오류:', error);
    return NextResponse.json({
      status: 'error',
      message: '스케줄러 처리 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 