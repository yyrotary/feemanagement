import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID } from '@/lib/notion';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// Gmail API 설정 값들 가져오기
const GMAIL_USER = 'me';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// 저장된 인증 정보 로드 및 토큰 새로고침
async function loadSavedCredentialsIfExist() {
  try {
    // 환경 변수에서 토큰 가져오기
    const token = process.env.GOOGLE_TOKEN;
    if (!token) {
      console.log('GOOGLE_TOKEN 환경 변수가 설정되지 않았습니다.');
      return null;
    }
    
    // 환경 변수에서 클라이언트 정보 가져오기
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
      console.log('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
      return null;
    }
    
    // 토큰과 클라이언트 정보 파싱
    const parsedToken = JSON.parse(token);
    const parsedCredentials = JSON.parse(credentials);
    const clientInfo = parsedCredentials.installed || parsedCredentials.web;
    
    // OAuth2 클라이언트 생성
    const oauth2Client = new OAuth2Client({
      clientId: clientInfo.client_id,
      clientSecret: clientInfo.client_secret,
      redirectUri: clientInfo.redirect_uris?.[0] || 'http://localhost',
    });
    
    // 기존 토큰 설정
    oauth2Client.setCredentials({
      access_token: parsedToken.access_token,
      refresh_token: parsedToken.refresh_token,
      expiry_date: parsedToken.expiry_date || Date.now() + 3600 * 1000,
    });
    
    // 토큰이 만료되었는지 확인하고 필요하면 자동으로 새로고침
    const currentTime = Date.now();
    const expiryDate = parsedToken.expiry_date || 0;
    const tokenExpireThreshold = 5 * 60 * 1000; // 5분 이내 만료 예정이면 갱신

    if (!expiryDate || currentTime + tokenExpireThreshold >= expiryDate) {
      console.log('토큰이 만료되었거나 곧 만료됩니다. 새로고침 시도 중...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('액세스 토큰 새로고침 성공');
        
        // 서버리스 환경에서는 환경 변수를 실시간으로 업데이트 할 수 없기 때문에
        // 로그만 출력하고, 개발 환경에서 이 값을 Vercel에 수동으로 설정해야 합니다.
        console.log('새 토큰을 환경 변수 GOOGLE_TOKEN에 업데이트해야 합니다:');
        console.log(JSON.stringify({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || parsedToken.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
          id_token: credentials.id_token
        }));
      } catch (refreshError) {
        console.error('토큰 새로고침 오류:', refreshError);
        // 새로고침에 실패하더라도 계속 진행 (기존 토큰이 아직 유효할 수 있음)
      }
    }
    
    return oauth2Client;
  } catch (err) {
    console.error('저장된 인증 정보 로드 오류:', err);
    return null;
  }
}

// Gmail API 인증 (자동 갱신 지원)
async function getGmailClient() {
  try {
    // 인증 정보 로드 및 토큰 새로고침
    let oauth2Client = await loadSavedCredentialsIfExist();
    
    // 인증 정보가 없으면 에러
    if (!oauth2Client) {
      throw new Error('OAuth 인증에 필요한 토큰이나 인증 정보가 없습니다. 환경 변수를 확인하세요.');
    }
    
    // Gmail API 클라이언트 생성
    console.log('Gmail API 클라이언트 생성 중...');
    return google.gmail({ 
      version: 'v1', 
      auth: oauth2Client 
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
    
    // URL 쿼리 파라미터 파싱
    const url = new URL(request.url);
    const forceUpdate = url.searchParams.get('forceUpdate') === 'true';
    const sinceDateParam = url.searchParams.get('sinceDate');
    
    // 강제 업데이트 로그
    if (forceUpdate) {
      console.log('forceUpdate 매개변수가 설정되었습니다. 최근 거래내역 확인을 건너뜁니다.');
    }
    
    // 가장 최근 거래내역 조회 (forceUpdate가 아닌 경우)
    let sinceDate: Date | undefined = undefined;
    
    if (!forceUpdate) {
      const latestTransactionDate = await getLatestTransaction();
      
      // 거래내역 날짜를 기준으로 sinceDate 설정
      if (latestTransactionDate) {
        // 당일 자정 이후의 거래는 놓치지 않도록 날짜를 당일 0시로 설정
        sinceDate = new Date(latestTransactionDate);
        sinceDate.setHours(0, 0, 0, 0);
        console.log(`최근 거래내역 이후부터 검색: ${sinceDate.toISOString()}`);
      }
    }
    
    // URL 매개변수로 전달된 sinceDate가 있으면 우선 사용
    if (sinceDateParam) {
      try {
        sinceDate = new Date(sinceDateParam);
        console.log(`매개변수로 전달된 날짜부터 검색: ${sinceDate.toISOString()}`);
      } catch (error) {
        console.error('sinceDate 매개변수 파싱 오류:', error);
      }
    }
    
    // Gmail 클라이언트 인증
    const gmail = await getGmailClient();
    
    // 거래내역 이메일 검색 - 기존 syncTransactions의 getTransactionEmails 함수 사용
    console.log('최신 거래내역 이메일 검색 중...');
    
    // 기존 API 호출 - URL 생성 수정
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
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
      url: apiUrl.toString(),
      count: result.count || 0,
      nextPageToken: result.nextPageToken || null,
      sinceDate: sinceDate ? sinceDate.toISOString() : null,
      forceUpdate: forceUpdate
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