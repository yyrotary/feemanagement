import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID } from '@/lib/notion';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

// Gmail API 설정 값들 가져오기
const GMAIL_USER = 'me';
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// 저장된 인증 정보 로드 (재사용)
async function loadSavedCredentialsIfExist() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }
    const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error('저장된 인증 정보 로드 오류:', err);
    return null;
  }
}

// Gmail API 인증 (재사용)
async function getGmailClient() {
  try {
    // 인증 파일 확인
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(`OAuth 인증 파일을 찾을 수 없습니다: ${CREDENTIALS_PATH}`);
    }

    // 저장된 인증 정보 로드
    let client = await loadSavedCredentialsIfExist();
    
    // 저장된 인증 정보가 없으면 새로 인증 진행 (서버에서는 불가능)
    if (!client) {
      throw new Error('OAuth 인증 토큰이 없습니다. 먼저 로컬에서 인증을 수행해야 합니다.');
    }
    
    // Gmail API 클라이언트 생성
    return google.gmail({ 
      version: 'v1', 
      auth: client as any 
    });
  } catch (error) {
    console.error('Gmail API 인증 오류:', error);
    throw new Error(`Gmail API에 연결할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 가장 최근 거래내역 조회
async function getLatestTransaction() {
  try {
    // 날짜 내림차순으로 정렬하여 최신 거래내역 1건 조회
    const response = await notionClient.databases.query({
      database_id: TRANSACTIONS_DB_ID,
      sorts: [
        {
          property: 'date',
          direction: 'descending'
        }
      ],
      page_size: 1 // 1건만 조회
    });
    
    if (response.results.length === 0) {
      console.log('저장된 거래내역이 없습니다. 처음부터 동기화합니다.');
      return null;
    }
    
    // 노션 응답 타입 명시적 변환
    const latestTransaction = response.results[0] as any;
    const date = latestTransaction.properties?.date?.date?.start;
    
    if (!date) {
      console.log('최근 거래내역의 날짜 정보를 찾을 수 없습니다.');
      return null;
    }
    
    console.log(`가장 최근 거래내역 날짜: ${date}`);
    return new Date(date);
  } catch (error) {
    console.error('최근 거래내역 조회 오류:', error);
    return null;
  }
}

// 중복 트랜잭션 필터링
function filterDuplicates(newTransactions: any[], existingTransactions: any[]) {
  console.log(`기존 트랜잭션: ${existingTransactions.length}개`);
  
  // 날짜별로 기존 트랜잭션을 그룹화
  const existingTransactionsByDate = new Map<string, any[]>();
  existingTransactions.forEach(tx => {
    const date = tx.date?.split('T')[0] || '';
    if (!existingTransactionsByDate.has(date)) {
      existingTransactionsByDate.set(date, []);
    }
    existingTransactionsByDate.get(date)?.push(tx);
  });

  // 적요에서 공백을 제거하고 앞 4글자만 추출하는 함수
  const getNormalizedDescription = (desc: string): string => {
    return (desc || '').replace(/\s/g, '').substring(0, 4);
  };

  const filteredTransactions = newTransactions.filter(newTx => {
    // 날짜의 T 이전 부분만 비교 (시간 제외)
    const newDate = newTx.date?.split('T')[0] || '';
    if (!newDate) {
      console.log(`날짜가 없는 트랜잭션 발견:`, JSON.stringify(newTx, null, 2));
      return false;
    }

    // 해당 날짜의 기존 트랜잭션만 가져옴
    const sameDateTransactions = existingTransactionsByDate.get(newDate) || [];
    
    // 기존 트랜잭션과 비교
    const isDuplicate = sameDateTransactions.some(existingTx => {
      // 1. 입출금 금액 비교
      if (existingTx.in !== newTx.in || existingTx.out !== newTx.out) {
        return false;
      }

      // 2. 잔고 비교
      if (existingTx.balance !== newTx.balance) {
        return false;
      }

      // 3. 적요 비교 (공백 제거 후 앞 4글자)
      const existingDesc = getNormalizedDescription(existingTx.description);
      const newDesc = getNormalizedDescription(newTx.description);
      
      return existingDesc === newDesc;
    });
    
    return !isDuplicate;
  });
  
  console.log(`중복 제거 후 트랜잭션: ${filteredTransactions.length}개`);
  return filteredTransactions;
}

// POST 메서드 - 최신 거래내역부터 업데이트
export async function POST(request: Request) {
  try {
    console.log('거래내역 업데이트 요청 처리 중...');
    
    // 가장 최근 거래내역 조회
    const latestTransactionDate = await getLatestTransaction();
    
    // 거래내역 날짜를 기준으로 sinceDate 설정
    let sinceDate: Date | undefined = undefined;
    if (latestTransactionDate) {
      // 당일 자정 이후의 거래는 놓치지 않도록 날짜를 당일 0시로 설정
      sinceDate = new Date(latestTransactionDate);
      sinceDate.setHours(0, 0, 0, 0);
      console.log(`최근 거래내역 이후부터 검색: ${sinceDate.toISOString()}`);
    }
    
    // Gmail 클라이언트 인증
    const gmail = await getGmailClient();
    
    // 거래내역 이메일 검색 - 기존 syncTransactions의 getTransactionEmails 함수 사용
    console.log('최신 거래내역 이메일 검색 중...');
    
    // 기존 API 호출 - URL 생성 수정
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/syncTransactions', baseUrl);
    
    // URL 매개변수 추가
    if (sinceDate) {
      apiUrl.searchParams.append('sinceDate', sinceDate.toISOString());
    }
    apiUrl.searchParams.append('batchSize', '500');
    
    console.log(`API 호출 URL: ${apiUrl.toString()}`);
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`거래내역 동기화 API 호출 실패: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      status: 'success',
      message: `최근 거래내역 업데이트 완료 (${sinceDate ? sinceDate.toLocaleDateString() : '전체'} 이후)`,
      emailsProcessed: result.emailsProcessed || 0,
      count: result.count || 0,
      nextPageToken: result.nextPageToken || null,
      sinceDate: sinceDate ? sinceDate.toISOString() : null
    });
    
  } catch (error) {
    console.error('거래내역 업데이트 중 오류 발생:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: '거래내역 업데이트 중 오류 발생', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 