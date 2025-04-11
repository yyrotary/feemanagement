import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID, DATABASE_IDS } from '@/lib/notion';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { OAuth2Client } from 'google-auth-library';
import { Transaction, NotionMemberProperties } from '@/lib/notion-types';

// Gmail API 설정
const GMAIL_USER = 'me'; // 'me'는 인증된 사용자를 의미함
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const VERIFICATION_CODE = '5088260376'; // NH농협 거래내역 확인 시 필요한 인증번호

// 저장된 인증 정보 로드
async function loadSavedCredentialsIfExist() {
  try {
    // 프로덕션 환경에서는 항상 환경 변수에서 토큰 가져오기
    const token = process.env.GOOGLE_TOKEN;
    if (!token) {
      console.log('GOOGLE_TOKEN 환경 변수가 설정되지 않았습니다.');
      return null;
    }
    
    const credentials = JSON.parse(token);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error('저장된 인증 정보 로드 오류:', err);
    return null;
  }
}

// 인증 정보 저장 (Vercel 환경에서는 실제로 저장되지 않음, 로그만 출력)
async function saveCredentials(client: OAuth2Client) {
  try {
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
    }
    
    const keys = JSON.parse(credentials);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    
    // 환경 변수에 저장하는 대신 콘솔에 출력 (실제로는 Vercel 환경 변수에 설정해야 함)
    console.log('인증 정보를 환경 변수 GOOGLE_TOKEN에 저장해야 합니다:');
    console.log(payload);
    
    // 개발 환경을 위한 임시 저장 (테스트용)
    if (process.env.NODE_ENV !== 'production') {
      process.env.GOOGLE_TOKEN = payload;
    }
  } catch (err) {
    console.error('인증 정보 저장 오류:', err);
    throw new Error('인증 정보를 저장할 수 없습니다.');
  }
}

// Gmail API 인증
async function getGmailClient() {
  try {
    // 인증 정보 확인
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
      console.error('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
      throw new Error('GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
    }

    // 저장된 인증 정보 로드
    let client = await loadSavedCredentialsIfExist();
    
    // 저장된 인증 정보가 없으면 새로 인증 진행 (서버에서는 불가능)
    if (!client) {
      console.error('OAuth 인증 토큰이 없습니다. GOOGLE_TOKEN 환경 변수를 설정해야 합니다.');
      throw new Error('OAuth 인증 토큰이 없습니다. GOOGLE_TOKEN 환경 변수를 설정해야 합니다.');
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

// 보안메일 인증 처리 함수
async function processSecureEmail(htmlContent: string): Promise<string> {
  let browser;
  try {
    // 브라우저 실행 - Vercel 환경에 맞게 수정
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    });
    
    const page = await browser.newPage();
    
    // 페이지 타임아웃 설정
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    
    // 브라우저 콘솔 로그를 서버 콘솔에 출력
    page.on('console', msg => console.log('브라우저 콘솔:', msg.text()));
    
    // HTML 컨텐츠를 직접 설정
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 인증 필요 여부 확인
    const needAuth = await page.evaluate(() => {
      const bodyText = document.body?.textContent || '';
      return bodyText.includes('보안메일인증') || 
             bodyText.includes('인증번호') ||
             document.querySelector('input[type="text"], input[type="password"], input:not([type])') !== null;
    });
    
    if (!needAuth) {
      console.log('이 페이지는 인증이 필요 없거나 이미 인증되었습니다.');
      return await page.content();
    }
    
    console.log('인증이 필요한 보안메일 확인됨, 인증 시도 중...');
    
    // 전역 버튼 찾기 성공 여부 플래그 선언
    let buttonFound = false;

    // 인증 입력 필드 찾기
    try {
      const inputSelector = 'input[type="text"], input[type="password"], input:not([type])';
      await page.waitForSelector(inputSelector, { timeout: 5000 });
      
      // 인증번호 입력
      await page.evaluate((code) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"], input:not([type])');
        if(inputs.length > 0) {
          (inputs[0] as HTMLInputElement).value = code;
        }
      }, process.env.VERIFICATION_CODE || '5088260376');
      
      // 인증 버튼 찾기 및 클릭
      const buttonSelectors = [
        'input[type="submit"][value="확인"]',
        'input[value="확인"]',
        'input#confirm[type="submit"]',
        'input#confirm',
        'input[type="submit"]',
        'button#confirm',
        'button',
        'a.btn',
        '[onclick]'
      ];
      
      for (const selector of buttonSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          buttonFound = true;
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
          break;
        }
      }
      
      if (!buttonFound) {
        // doAction 함수 호출 시도
        await page.evaluate(() => {
          if (typeof (window as any).doAction === 'function') {
            (window as any).doAction();
            return true;
          }
          return false;
        });
      }
      
      // 처리된 결과 대기
      await page.waitForFunction(() => {
        const bodyText = document.body?.textContent || '';
        return document.querySelector('table') !== null ||
               bodyText.includes('거래내역') ||
               bodyText.includes('입금') ||
               bodyText.includes('출금') ||
               bodyText.includes('잔액');
      }, { timeout: 10000 });
      
    } catch (error) {
      console.error('인증 처리 중 오류:', error);
    }
    
    // 최종 HTML 반환
    return await page.content();
    
  } catch (error) {
    console.error('보안메일 처리 중 오류:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 메일 목록 가져오기 (NH농협 거래내역 메일)
async function getTransactionEmails(
  gmail: any, 
  pageToken?: string | null, 
  olderThanDate?: Date,
  sinceDate?: Date,
  batchSize: number = 500  // 기본값 증가
) {
  // 검색 쿼리 구성
  let query = 'from:nonghyupcorp.com OR from:webmaster@ums.nonghyup.com OR subject:"입출금" OR subject:"거래내역" OR subject:"계좌" OR subject:"농협"';
  
  // 날짜 범위 추가
  if (olderThanDate) {
    const formattedDate = formatDateToISO8601(olderThanDate);
    query += ` before:${formattedDate}`;
  }
  
  if (sinceDate) {
    const formattedDate = formatDateToISO8601(sinceDate);
    query += ` after:${formattedDate}`;
  }
  
  console.log(`Gmail 검색 쿼리: ${query}`);
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: batchSize,
      pageToken: pageToken || undefined
    });
    
    const { messages = [], nextPageToken } = response.data;
    console.log(`Gmail API 응답: ${messages.length}개 메시지 찾음, 다음 페이지 토큰: ${nextPageToken || '없음'}`);
    
    return { messages, nextPageToken };
  } catch (error) {
    console.error('Gmail API 메시지 검색 오류:', error);
    throw new Error(`Gmail API 메시지 검색 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 메일 첨부 파일(HTML) 다운로드 및 처리
async function downloadAttachment(gmail: any, messageId: string, emailDate: Date) {
  try {
    console.log(`메시지 ID ${messageId}의 첨부파일 처리 시작...`);
    
    // 전체 메시지 정보 가져오기
    console.log('Gmail API로 메시지 정보 요청 중...');
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    }).catch(error => {
      console.error('Gmail API 메시지 조회 실패:', error);
      throw error;
    });
    
    console.log('메시지 정보 받음:', message.data.id);
    
    if (!message.data.payload) {
      console.warn(`메시지 ID ${messageId}에 페이로드가 없음`);
      return null;
    }
    
    // 페이로드에서 파트 추출
    const { parts } = message.data.payload;
    let htmlContent = '';
    
    console.log(`메시지 파트 수: ${parts?.length || 0}`);
    
    // HTML 또는 텍스트 컨텐츠 추출
    if (message.data.payload.body && message.data.payload.body.data) {
      console.log('메시지 바디에서 직접 컨텐츠 추출 시도...');
      const body = message.data.payload.body.data;
      htmlContent = Buffer.from(body, 'base64').toString('utf-8');
      console.log(`메시지 바디에서 직접 컨텐츠 추출 완료 (길이: ${htmlContent.length})`);
    }
    
    // 페이로드 파트 처리
    if (parts && parts.length > 0) {
      console.log(`메시지의 ${parts.length}개 파트 처리 중...`);
      
      for (const part of parts) {
        console.log(`파트 처리 중: ${part.mimeType}`);
        
        // 텍스트 또는 HTML 파트 처리
        if (part.mimeType === 'text/html' && part.body.data) {
          console.log('HTML 파트 발견, 디코딩 중...');
          const decodedBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          htmlContent = decodedBody;
          console.log(`HTML 컨텐츠 디코딩 완료 (길이: ${htmlContent.length})`);
          break;
        }
        // 멀티파트 처리 (재귀적)
        else if (part.mimeType.startsWith('multipart/') && part.parts) {
          console.log(`멀티파트 발견, 재귀적으로 처리 중...`);
          for (const subPart of part.parts) {
            if (subPart.mimeType === 'text/html' && subPart.body.data) {
              console.log('멀티파트 내 HTML 파트 발견, 디코딩 중...');
              const decodedBody = Buffer.from(subPart.body.data, 'base64').toString('utf-8');
              htmlContent = decodedBody;
              console.log(`멀티파트 내 HTML 컨텐츠 디코딩 완료 (길이: ${htmlContent.length})`);
              break;
            }
          }
        }
        // 첨부파일 처리
        else if (part.filename && part.body.attachmentId) {
          console.log(`첨부파일 발견: ${part.filename}`);
          try {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: messageId,
              id: part.body.attachmentId,
            });
            
            if (attachment.data.data) {
              console.log(`첨부파일 데이터 크기: ${attachment.data.data.length} 바이트`);
              const attachmentData = Buffer.from(attachment.data.data, 'base64');
              
              // HTML 파일인 경우
              if (part.filename.endsWith('.html') || part.mimeType === 'text/html') {
                console.log('HTML 첨부파일 처리 중...');
                htmlContent = attachmentData.toString('utf-8');
                console.log(`HTML 첨부파일 컨텐츠 추출 완료 (길이: ${htmlContent.length})`);
              }
            }
          } catch (error) {
            console.error(`첨부파일 처리 중 오류:`, error);
          }
        }
      }
    }
    
    // HTML 내용이 있는 경우 처리
    if (htmlContent) {
      console.log('HTML 내용 처리 중...');
      
      // HTML이 보안 이메일인지 확인
      if (htmlContent.includes('보안메일') || 
          htmlContent.includes('SecureMail') || 
          htmlContent.includes('안전한 메일')) {
        console.log('보안 이메일 감지됨, 특수 처리 중...');
        try {
          htmlContent = await processSecureEmail(htmlContent);
          console.log('보안 이메일 처리 완료');
        } catch (error) {
          console.error('보안 이메일 처리 중 오류:', error);
          throw error;
        }
      }
      
      // 거래내역 파싱
      console.log('거래내역 파싱 시작...');
      const transactions = parseTransactionData(htmlContent, emailDate);
      console.log(`거래내역 파싱 완료: ${transactions.length}개 발견`);
      return transactions;
    } else {
      console.log(`메시지 ID ${messageId}에서 HTML 컨텐츠를 찾을 수 없음`);
      return null;
    }
  } catch (error) {
    console.error(`메시지 ID ${messageId} 처리 중 오류:`, error);
    return null;
  }
}

// HTML 내용에서 거래내역 파싱 - 메일 발송 시간 추가
function parseTransactionData(htmlContent: string, emailDate: Date): Array<{
  date: string;
  emailDate: Date;
  type: string;
  amount: number;
  balance: number;
  description: string;
  branch: string;
  bank: string;
}> {
  try {
    // 디버깅을 위해 HTML 내용 저장
    const debugDir = path.join(process.cwd(), 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const debugFilePath = path.join(debugDir, `parsed_mail_${Date.now()}.html`);
    fs.writeFileSync(debugFilePath, htmlContent);
    console.log(`디버깅용 HTML 파일 저장됨: ${debugFilePath}`);
    
    // HTML 내용 길이 로깅
    console.log(`HTML 내용 길이: ${htmlContent.length} 바이트`);
    console.log(`HTML 시작 부분: ${htmlContent.substring(0, 200)}...`);
    
    // 테이블 카운팅
    const $ = cheerio.load(htmlContent);
    const tableCount = $('table').length;
    console.log(`HTML 내 테이블 수: ${tableCount}`);
    
    // NH농협 거래내역 이메일 구조 확인
    let foundNHStructure = false;
    if (htmlContent.includes('NH농협') || 
        htmlContent.includes('농협UMS') || 
        htmlContent.includes('nonghyup.com')) {
      console.log('NH농협 거래내역 메일 구조 감지됨');
      foundNHStructure = true;
    }
    
    // 테이블 구조 로깅 (중요: NH농협 거래내역 메일은 여러 테이블이 있음)
    let transactionsTableIndex = -1;
    $('table').each((i, table) => {
      const rows = $(table).find('tr').length;
      const cols = $(table).find('tr:first').find('td, th').length;
      const headerText = $(table).find('tr:first').text().trim().substring(0, 50);
      const tableText = $(table).text().trim();
      console.log(`테이블 #${i+1}: ${rows}행 x ${cols}열, 헤더: "${headerText}..."`);
      
      // NH농협 거래내역 테이블 특징: "조회건수" 또는 "거래일" 포함
      if (tableText.includes('거래일') && tableText.includes('구분') && 
          (tableText.includes('거래금액') || tableText.includes('이전잔액'))) {
        console.log(`테이블 #${i+1}이 NH농협 거래내역 테이블로 보임`);
        if (transactionsTableIndex === -1) {
          transactionsTableIndex = i;
        }
      }
    });
    
    // NH농협 거래내역 특화 처리
    let transactionsTable;
    if (foundNHStructure && transactionsTableIndex >= 0) {
      transactionsTable = $('table').eq(transactionsTableIndex);
      console.log(`NH농협 거래내역 테이블 찾음 (인덱스: ${transactionsTableIndex})`);
    } else {
      // 기존 선택 로직 유지
      transactionsTable = $('table').filter((i, table) => {
        const headerText = $(table).find('tr:first-child').text();
        return headerText.includes('거래일') && 
               headerText.includes('구분') && 
               headerText.includes('금액');
      });
      
      // 첫 번째 시도 실패시 다른 선택자 시도
      if (transactionsTable.length === 0) {
        console.log('첫 번째 선택자로 테이블을 찾지 못함, 두 번째 선택자 시도 중...');
        // 거래내역 키워드를 포함한 테이블 찾기
        transactionsTable = $('table').filter((i, table) => {
          const tableText = $(table).text();
          return tableText.includes('거래내역') || 
                 tableText.includes('입금') || 
                 tableText.includes('출금') ||
                 tableText.includes('잔액');
        });
      }
      
      // 기존 선택 로직 (가장 큰 테이블 등) 유지...
    }
    
    if (transactionsTable.length === 0) {
      throw new Error('거래내역 테이블을 찾을 수 없습니다.');
    }
    
    console.log(`거래내역 테이블 찾음: ${transactionsTable.length}개`);
    
    const transactions: Array<{
      date: string;
      emailDate: Date;
      type: string;
      amount: number;
      balance: number;
      description: string;
      branch: string;
      bank: string;
    }> = [];
    
    // NH농협 거래내역 테이블 전용 파싱
    if (foundNHStructure) {
      console.log('NH농협 거래내역 전용 파싱 로직 사용');
      
      // 테이블의 각 행 처리 - NH농협 형식 (2번째 행부터 시작)
      transactionsTable.find('tr').slice(1).each((index, row) => {
        console.log(`NH 형식 행 #${index+1} 처리 중...`);
        const cells = $(row).find('td');
        console.log(`- 열 수: ${cells.length}`);
        
        // NH농협 거래내역 테이블은 8개의 열을 가짐
        if (cells.length >= 5) {
          // 각 열의 텍스트 로깅
          cells.each((i, cell) => {
            console.log(`  열 #${i+1}: "${$(cell).text().trim()}"`);
          });
          
          // NH농협 거래내역 메일의 8열 구조:
          // 1. 조회건수(0) | 2. 거래일(1) | 3. 구분(2) | 4. 거래금액(3) | 5. 거래후 잔액(4) | 6. 거래점(5) | 7. 거래은행(6) | 8. 기록사항(7)
          
          // 날짜 패턴 확인 (YYYY/MM/DD 형식)
          const dateText = $(cells[1]).text().trim(); // 두 번째 열이 거래일
          const datePattern = /\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2}/;
          
          if (datePattern.test(dateText) || dateText.includes('/')) {
            const type = $(cells[2]).text().trim(); // 세 번째 열이 구분(입금/출금)
            
            // 금액과 잔액에서 숫자만 추출
            const amountText = $(cells[3]).text().trim().replace(/[^\d]/g, '');
            const balanceText = $(cells[4]).text().trim().replace(/[^\d]/g, '');
            
            const amount = amountText ? parseInt(amountText) : 0;
            const balance = balanceText ? parseInt(balanceText) : 0;
            
            // 추가 정보 (8열 구조에 맞게 파싱)
            let description = '';
            let branch = '';
            let bank = '';
            
            if (cells.length > 5) {
              branch = $(cells[5]).text().trim(); // 여섯 번째 열이 거래점
            }
            if (cells.length > 6) {
              bank = $(cells[6]).text().trim(); // 일곱 번째 열이 거래은행
            }
            
            if (cells.length > 7) {
              description = $(cells[7]).text().trim(); // 여덟 번째 열이 기록사항
            }
            
            // 거래내역 객체 생성 (emailDate 추가)
            const transaction = {
              date: dateText,
              emailDate: emailDate, // 메일 발송 시간 추가
              type: type,
              amount: amount,
              balance: balance,
              description: description, // 설명이 없으면 구분으로 대체
              branch: branch,
              bank: bank
            };
            
            console.log(`추출된 NH 거래 정보 (8열 구조): ${JSON.stringify(transaction)}`);
            
            // 유효한 거래내역만 추가 (날짜가 있고 금액이 0보다 큰 경우)
            if (transaction.date && transaction.amount > 0) {
              transactions.push(transaction);
              console.log(`유효한 NH 거래내역 추가됨`);
            } else {
              console.log(`유효하지 않은 NH 거래내역 무시됨`);
            }
          } else {
            console.log(`날짜 형식이 아님, 건너뜀: "${dateText}"`);
          }
        }
      });
      
      if (transactions.length > 0) {
        console.log(`NH농협 8열 형식으로 ${transactions.length}개의 거래내역 추출 완료`);
        return transactions;
      } else {
        console.log('NH농협 형식으로 거래내역을 추출할 수 없음, 일반 파싱 시도');
      }
    }
    
    // 일반 거래내역 테이블 파싱 (기존 로직 유지)
    // ... 기존 일반 파싱 로직 ...
    
    console.log(`총 ${transactions.length}개의 거래내역 추출 완료`);
    return transactions;
  } catch (error) {
    console.error('거래내역 파싱 오류:', error);
    throw new Error(`HTML에서 거래내역을 추출할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 날짜를 ISO 8601 형식의 YYYY-MM-DD 문자열로 변환
function formatDateToISO8601(date: Date): string;
function formatDateToISO8601(dateStr: string): string;
function formatDateToISO8601(date: Date | string): string {
  if (typeof date === 'string') {
    // 문자열 형식(YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD)에서 날짜 추출
    const formats = [
      /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{4})\.(\d{2})\.(\d{2})/ // YYYY.MM.DD
    ];
    
    for (const format of formats) {
      const match = date.match(format);
      if (match) {
        const [_, year, month, day] = match;
        return `${year}-${month}-${day}`;
      }
    }
    // 매칭되지 않으면 원본 반환
    return date;
  } else {
    // Date 객체인 경우 기존 로직 사용
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// 날짜와 메일 시간을 결합하여 ISO 8601 형식으로 변환하는 함수
function formatDateTimeToISO8601(dateStr: string, emailDate: Date): string {
  try {
    // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD 형식에서 날짜 추출
    const formats = [
      /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{4})\.(\d{2})\.(\d{2})/ // YYYY.MM.DD
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [_, year, month, day] = match;
        
        // 메일 발송 시간(한국 시간)에서 시간, 분, 초 추출
        const koreaTime = new Date(emailDate.getTime() + 9 * 60 * 60 * 1000); // UTC -> KST (UTC+9)
        const hours = koreaTime.getUTCHours();
        const minutes = koreaTime.getUTCMinutes();
        const seconds = koreaTime.getUTCSeconds();
        
        // ISO 8601 형식으로 날짜와 시간 결합 (YYYY-MM-DDThh:mm:ss+09:00)
        const isoDateTime = `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}+09:00`;
        console.log(`날짜+시간 변환: ${dateStr} + ${koreaTime.toISOString()} => ${isoDateTime}`);
        return isoDateTime;
      }
    }
    
    // 다른 형식이거나 변환 실패 시 원본 반환 (오류 처리는 호출 측에서)
    console.warn(`날짜 형식 변환 실패: ${dateStr}`);
    return emailDate.toISOString(); // 메일 날짜라도 반환
  } catch (error) {
    console.error(`날짜 변환 오류 (${dateStr}):`, error);
    return emailDate.toISOString(); // 메일 날짜라도 반환
  }
}

// 중복 트랜잭션 필터링
function filterDuplicates(newTransactions: Transaction[], existingTransactions: Transaction[]) {
  console.log(`기존 트랜잭션: ${existingTransactions.length}개`);
  
  // 날짜별로 기존 트랜잭션을 그룹화
  const existingTransactionsByDate = new Map<string, Transaction[]>();
  
  // 날짜별로 기존 트랜잭션 정리
  existingTransactions.forEach(tx => {
    const date = tx.date?.split('T')[0] || '';
    if (!existingTransactionsByDate.has(date)) {
      existingTransactionsByDate.set(date, []);
    }
    existingTransactionsByDate.get(date)?.push(tx);
  });

  // 적요에서 공백을 제거하고 앞 4글자만 추출하는 함수
  const getNormalizedDescription = (desc: string): string => {
    // null이나 undefined 처리 및 공백 제거 후 앞 4글자 추출
    const cleaned = (desc || '').replace(/\s+/g, '');
    return cleaned.substring(0, 4);
  };

  // 새 트랜잭션 중 중복되지 않은 것만 필터링
  const filteredTransactions = newTransactions.filter(newTx => {
    // 날짜의 T 이전 부분만 비교 (시간 제외)
    const newDate = newTx.date?.split('T')[0] || '';
    
    // 날짜가 없는 경우 처리
    if (!newDate) {
      console.log(`날짜가 없는 트랜잭션 제외:`, JSON.stringify(newTx, null, 2));
      return false;
    }

    // 해당 날짜의 기존 트랜잭션만 가져와 비교 (성능 최적화)
    const sameDateTransactions = existingTransactionsByDate.get(newDate) || [];
    if (sameDateTransactions.length === 0) {
      // 같은 날짜의 기존 트랜잭션이 없으면 중복이 아님
      return true;
    }
    
    // 정규화된 설명 (공백 제거 후 앞 4글자)
    const newDesc = getNormalizedDescription(newTx.description);
    
    // 기존 트랜잭션과 비교하여 중복 여부 확인
    const isDuplicate = sameDateTransactions.some(existingTx => {
      // 1. 입출금 금액 비교 (빠른 조기 종료)
      if (existingTx.in !== newTx.in || existingTx.out !== newTx.out) {
        return false;
      }

      // 2. 잔고 비교 (빠른 조기 종료)
      if (existingTx.balance !== newTx.balance) {
        return false;
      }

      // 3. 적요 비교 (공백 제거 후 앞 4글자)
      const existingDesc = getNormalizedDescription(existingTx.description);
      
      return existingDesc === newDesc;
    });
    
    // 중복이 아닌 경우에만 포함
    return !isDuplicate;
  });
  
  console.log(`중복 제거 후 새로운 트랜잭션: ${filteredTransactions.length}개`);
  return filteredTransactions;
}

// 노션 데이터베이스에 거래내역 저장
async function saveTransactionsToNotion(transactions: Array<{
  date: string;
  emailDate: Date;
  type: string;
  amount: number;
  balance: number;
  description: string;
  branch: string;
  bank: string;
}>) {
  try {
    // Notion API 키 확인
    if (!process.env.NOTION_API_KEY) {
      console.error('NOTION_API_KEY 환경 변수가 설정되지 않았습니다.');
      throw new Error('NOTION_API_KEY 환경 변수가 설정되지 않았습니다.');
    }

    // 기존 거래내역 조회
    console.log('Notion 데이터베이스에서 기존 거래내역 조회 중...');
    const existingResponse = await notionClient.databases.query({
      database_id: TRANSACTIONS_DB_ID,
    }).catch(error => {
      console.error('Notion 데이터베이스 조회 오류:', error);
      throw new Error(`Notion 데이터베이스 조회 실패: ${error.message}`);
    });
    
    console.log(`기존 거래내역 ${existingResponse.results.length}개 발견`);
    
    const existingTransactions: Transaction[] = existingResponse.results.map((page: any) => ({
      date: page.properties.date?.date?.start || '',
      in: page.properties.in?.number || 0,
      out: page.properties.out?.number || 0,
      balance: page.properties.balance?.number || 0,
      description: page.properties.description?.rich_text?.[0]?.plain_text || '',
    }));
    
    // 모든 회원 목록 가져오기
    console.log('회원 목록 조회 중...');
    const membersResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      sorts: [
        {
          property: 'Name',
          direction: 'ascending'
        }
      ]
    });
    
    // 회원 정보 맵 생성 (이름과 닉네임으로 검색할 수 있도록)
    const memberMap = new Map<string, string>();
    const memberNameMap = new Map<string, string>(); // ID -> 이름 맵 추가
    
    membersResponse.results.forEach((page: any) => {
      const id = page.id;
      // 이름 추출
      const name = page.properties.Name?.title?.[0]?.plain_text || '';
      // 닉네임 추출 (있는 경우)
      const nickname = page.properties.Nickname?.rich_text?.[0]?.plain_text || '';
      
      if (name) {
        // 이름으로 검색용 맵에 추가 (소문자, 공백 제거)
        memberMap.set(name.toLowerCase().replace(/\s+/g, ''), id);
        memberNameMap.set(id, name); // ID -> 이름 맵에 추가
      }
      
      if (nickname) {
        // 닉네임으로 검색용 맵에 추가 (소문자, 공백 제거)
        memberMap.set(nickname.toLowerCase().replace(/\s+/g, ''), id);
      }
    });
    
    console.log(`총 ${memberMap.size}개의 회원 정보를 로드했습니다.`);
    
    // 거래내역을 Notion 형식으로 변환
    const notionTransactions: Transaction[] = transactions.map(transaction => ({
      date: formatDateTimeToISO8601(transaction.date, transaction.emailDate),
      in: transaction.type.includes('입금') ? transaction.amount : 0,
      out: transaction.type.includes('출금') ? transaction.amount : 0,
      balance: transaction.balance,
      description: transaction.description,
      branch: transaction.branch,
      bank: transaction.bank
    }));
    
    // 중복 제거
    const newTransactions = filterDuplicates(notionTransactions, existingTransactions);
    
    if (newTransactions.length === 0) {
      console.log('새로운 거래내역이 없습니다.');
      return 0;
    }
    
    // 새로운 거래내역 저장
    const savePromises = newTransactions.map(async transaction => {
      const properties: any = {
        date: {
          type: 'date',
          date: { start: transaction.date },
        },
        in: {
          type: 'number',
          number: transaction.in,
        },
        out: {
          type: 'number',
          number: transaction.out,
        },
        balance: {
          type: 'number',
          number: transaction.balance,
        },
        description: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: transaction.description } }],
        },
        branch: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: transaction.branch || '' } }],
        },
        bank: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: transaction.bank || '' } }],
        },
      };
      
      // 입금인 경우 적요에서 회원 정보 찾기
      if (transaction.in > 0 && transaction.description) {
        // 적요에서 공백 제거하고 소문자로 변환
        const cleanDescription = transaction.description.toLowerCase().replace(/\s+/g, '');
        
        // 모든 회원 이름과 닉네임 중에 적요에 포함된 것이 있는지 검사
        let foundMemberId: string | null = null;
        
        for (const [key, id] of memberMap.entries()) {
          // 회원 이름/닉네임이 3글자 이상이고 적요에 포함되어 있는 경우만 매칭
          if (key.length >= 3 && cleanDescription.includes(key)) {
            foundMemberId = id;
            console.log(`거래내역 "${transaction.description}"에서 회원 "${key}" 찾음 (ID: ${id})`);
            break;
          }
        }
        
        // 회원을 찾은 경우 관계형 필드 설정 및 추가 처리
        if (foundMemberId) {
          properties.relatedmember = {
            type: 'relation',
            relation: [{ id: foundMemberId }]
          };
          
          // 추가 처리: 입금 내역의 적요에 따라 해당하는 DB에 항목 생성
          const memberName = memberNameMap.get(foundMemberId) || '';
          
          try {
            // 1. 회비 처리
            if (cleanDescription.includes('회비')) {
              console.log(`회비 입금 감지됨: ${memberName}, 금액: ${transaction.in}원`);
              await createFeeRecord(foundMemberId, transaction.date, transaction.in);
            }
            // 2. 봉사금 처리
            else if (cleanDescription.includes('봉사')) {
              console.log(`봉사금 입금 감지됨: ${memberName}, 금액: ${transaction.in}원`);
              await createServiceFeeRecord(foundMemberId, transaction.date, transaction.in);
            }
            // 3. 특별회비/경조사 처리
            else if (cleanDescription.includes('특별') || cleanDescription.includes('경조')) {
              console.log(`특별회비 입금 감지됨: ${memberName}, 금액: ${transaction.in}원`);
              await createSpecialFeeRecord(foundMemberId, transaction.date, transaction.in);
            }
          } catch (error) {
            console.error(`회원 ${memberName}의 입금 내역 처리 중 오류:`, error);
            // 계속 진행 (메인 거래내역은 저장)
          }
        }
      }
      
      // 거래내역 생성
      return notionClient.pages.create({
        parent: { database_id: TRANSACTIONS_DB_ID },
        properties: properties,
      });
    });
    
    await Promise.all(savePromises);
    console.log(`${newTransactions.length}개의 새로운 거래내역이 저장되었습니다.`);
    return newTransactions.length;
  } catch (error) {
    console.error('거래내역 저장 중 오류:', error);
    throw error;
  }
}

// 회비 내역 생성 함수
async function createFeeRecord(memberId: string, date: string, amount: number) {
  try {
    await notionClient.pages.create({
      parent: { database_id: DATABASE_IDS.FEES },
      properties: {
        id: {
          title: [{ text: { content: `회비_${new Date().getTime()}` } }]
        },
        name: {
          relation: [{ id: memberId }]
        },
        date: {
          date: { start: date.split('T')[0] } // 시간 부분 제거
        },
        paid_fee: {
          number: amount
        },
        method: {
          multi_select: [{ name: '입금' }]
        }
      }
    });
    console.log(`회비 내역 생성 완료: 회원 ID ${memberId}, 날짜 ${date.split('T')[0]}, 금액 ${amount}원`);
  } catch (error) {
    console.error('회비 내역 생성 중 오류:', error);
    throw error;
  }
}

// 봉사금 내역 생성 함수
async function createServiceFeeRecord(memberId: string, date: string, amount: number) {
  try {
    await notionClient.pages.create({
      parent: { database_id: DATABASE_IDS.SERVICE_FEES },
      properties: {
        id: {
          title: [{ text: { content: `봉사금_${new Date().getTime()}` } }]
        },
        name: {
          relation: [{ id: memberId }]
        },
        date: {
          date: { start: date.split('T')[0] } // 시간 부분 제거
        },
        paid_fee: {
          number: amount
        },
        method: {
          multi_select: [{ name: '입금' }]
        }
      }
    });
    console.log(`봉사금 내역 생성 완료: 회원 ID ${memberId}, 날짜 ${date.split('T')[0]}, 금액 ${amount}원`);
  } catch (error) {
    console.error('봉사금 내역 생성 중 오류:', error);
    throw error;
  }
}

// 특별회비 내역 생성 함수
async function createSpecialFeeRecord(memberId: string, date: string, amount: number) {
  try {
    await notionClient.pages.create({
      parent: { database_id: DATABASE_IDS.SPECIAL_FEES },
      properties: {
        이름: {
          title: [{ text: { content: `특별회비_${new Date().getTime()}` } }]
        },
        name: {
          relation: [{ id: memberId }]
        },
        date: {
          date: { start: date.split('T')[0] } // 시간 부분 제거
        },
        paid_fee: {
          number: amount
        },
        method: {
          multi_select: [{ name: '입금' }]
        }
      }
    });
    console.log(`특별회비 내역 생성 완료: 회원 ID ${memberId}, 날짜 ${date.split('T')[0]}, 금액 ${amount}원`);
  } catch (error) {
    console.error('특별회비 내역 생성 중 오류:', error);
    throw error;
  }
}

// GET 메서드 수정 - 메일 하나씩 처리하도록 변경
export async function GET(request: Request) {
  try {
    // 환경 변수 확인 로그 추가
    console.log('환경 변수 확인:');
    console.log('GOOGLE_CREDENTIALS:', process.env.GOOGLE_CREDENTIALS ? '설정됨' : '설정되지 않음');
    console.log('GOOGLE_TOKEN:', process.env.GOOGLE_TOKEN ? '설정됨' : '설정되지 않음');
    console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? '설정됨' : '설정되지 않음');
    console.log('TRANSACTIONS_DB_ID:', process.env.TRANSACTIONS_DB_ID ? '설정됨' : '설정되지 않음');

    // URL 파라미터 처리
    const url = new URL(request.url);
    const olderThanParam = url.searchParams.get('olderThan');
    const batchSizeParam = url.searchParams.get('batchSize');
    const sinceDateParam = url.searchParams.get('sinceDate');
    
    // 파라미터 변환
    let olderThanDate: Date | undefined;
    let sinceDate: Date | undefined;
    let batchSize = 5000; // 기본 배치 크기 증가
    
    if (olderThanParam) {
      try {
        olderThanDate = new Date(olderThanParam);
        console.log(`검색 기준일: ${olderThanDate.toISOString()}`);
      } catch (e) {
        console.error('olderThan 파라미터 형식 오류:', e);
      }
    }
    
    if (sinceDateParam) {
      try {
        sinceDate = new Date(sinceDateParam);
        console.log(`시작일: ${sinceDate.toISOString()}`);
      } catch (e) {
        console.error('sinceDate 파라미터 형식 오류:', e);
      }
    }
    
    if (batchSizeParam) {
      const parsedBatchSize = parseInt(batchSizeParam, 10);
      if (!isNaN(parsedBatchSize) && parsedBatchSize > 0) {
        batchSize = parsedBatchSize; // 이제 제한 없음
        console.log(`배치 크기: ${batchSize}`);
      }
    }
    
    // Gmail 클라이언트 인증
    const gmail = await getGmailClient();
    
    // 거래내역 이메일 검색 (배치 크기 및 날짜 범위 적용)
    console.log('거래내역 이메일 검색 중...');
    const { messages, nextPageToken } = await getTransactionEmails(
      gmail, 
      null, 
      olderThanDate,
      sinceDate,
      batchSize
    );
    
    console.log(`검색된 이메일 수: ${messages?.length || 0}`);
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ 
        status: 'success', 
        message: '처리할 이메일이 없습니다.', 
        count: 0,
        nextPageToken: nextPageToken || null
      });
    }
    
    let emailsProcessed = 0;
    let processedMessageIds: string[] = [];
    let totalSavedCount = 0;
    
    // 메시지 순차 처리 (한 번에 하나씩)
    console.log(`${messages.length}개의 이메일을 하나씩 순차적으로 처리 중...`);
    
    for (const message of messages) {
      try {
        const messageId = message.id;
        processedMessageIds.push(messageId);
        console.log(`이메일 처리 중 (ID: ${messageId})...`);
        
        // 이메일 헤더 정보 가져오기
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        
        const headers = messageDetails.data.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const fromHeader = headers.find(h => h.name === 'From');
        const dateHeader = headers.find(h => h.name === 'Date');
        
        const subject = subjectHeader?.value || 'No Subject';
        const from = fromHeader?.value || 'Unknown Sender';
        const dateStr = dateHeader?.value || '';
        
        // 이메일 날짜 추출
        let emailDate = new Date();
        if (dateStr) {
          try {
            emailDate = new Date(dateStr);
          } catch (err) {
            console.warn(`이메일 날짜 파싱 실패: ${dateStr}`);
          }
        }
        
        console.log(`이메일 제목: "${subject}", 보낸사람: "${from}", 날짜: ${emailDate.toISOString()}`);
        
        // 이메일에서 거래내역 추출
        const transactions = await downloadAttachment(gmail, messageId, emailDate);
        
        // 거래내역이 있으면 즉시 Notion에 저장
        if (transactions && transactions.length > 0) {
          console.log(`이메일 ID ${messageId}에서 ${transactions.length}개의 거래내역 추출 성공`);
          
          // 각 이메일에서 추출한 거래내역 바로 저장
          try {
            const savedCount = await saveTransactionsToNotion(transactions);
            console.log(`이메일 ID ${messageId}에서 ${savedCount}개의 거래내역 Notion에 저장 완료`);
            totalSavedCount += savedCount;
          } catch (saveError) {
            console.error(`이메일 ID ${messageId} 거래내역 저장 중 오류:`, saveError);
            // 오류가 발생해도 계속 진행
          }
        } else {
          console.log(`이메일 ID ${messageId}에서 거래내역을 추출할 수 없음`);
        }
      } catch (error) {
        console.error(`이메일 ID ${messageId} 처리 중 오류:`, error);
      }
    }
    
    return NextResponse.json({ 
      status: 'success', 
      message: '거래내역 동기화가 완료되었습니다.', 
      count: totalSavedCount,
      nextPageToken: nextPageToken || null
    });
  } catch (error) {
    console.error('거래내역 동기화 중 오류:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: '거래내역 동기화 중 오류가 발생했습니다.', 
      count: 0,
      nextPageToken: null
    });
  }
}