import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID } from '@/lib/notion';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 기본 바디 파서 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
};

// 엑셀 파일 파싱 함수
async function parseExcel(file: File): Promise<any[]> {
  try {
    console.log('엑셀 파일 파싱 시작...');
    
    // 파일 데이터를 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    
    // xlsx 라이브러리로 엑셀 파일 파싱
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    
    // 첫 번째 시트 가져오기
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 워크시트 범위 정보 (A1:Z100 같은 형식)
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`엑셀 시트 범위: ${worksheet['!ref']}`);
    console.log(`시작 행: ${range.s.r}, 마지막 행: ${range.e.r}`);
    console.log(`시작 열: ${range.s.c}, 마지막 열: ${range.e.c}`);
    
    // 디버깅: 첫 10개 셀 내용 출력
    console.log('엑셀 셀 내용 샘플:');
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      const rowData: Record<string, any> = {};
      for (let c = range.s.c; c <= Math.min(range.s.c + 10, range.e.c); c++) {
        const cellAddress = xlsx.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (cell) {
          const cellValue = cell.v;
          rowData[`${String.fromCharCode(65 + c)}`] = cellValue;
          console.log(`셀 ${cellAddress}: ${cellValue} (${typeof cellValue})`);
        }
      }
      console.log(`행 ${r + 1}:`, rowData);
    }
    
    // 실제 헤더 행 찾기 (NH 은행 거래내역은 보통 상단에 설명 행이 있음)
    let headerRowIndex = range.s.r; // 기본값은 첫 번째 행
    let dataStartRowIndex = headerRowIndex + 1;
    
    // 상단 설명 행 건너뛰기 - '거래일자', '적요', '출금', '입금', '잔액' 등의 열 헤더 찾기
    const headerKeywords = ['거래일자', '적요', '출금', '입금', '잔액', '거래내용', '거래점', '시간'];
    
    // 첫 10개 행에서 헤더 행 찾기
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      let foundKeywords = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v).trim();
          if (headerKeywords.some(keyword => cellValue.includes(keyword))) {
            foundKeywords++;
          }
        }
      }
      // 2개 이상의 키워드가 발견되면 헤더 행으로 간주
      if (foundKeywords >= 2) {
        headerRowIndex = r;
        dataStartRowIndex = r + 1;
        console.log(`헤더 행 발견: ${r + 1}행 (${foundKeywords}개 키워드 일치)`);
        break;
      }
    }
    
    // NH은행 특수 로직: '입출금거래내역조회 결과' 등의 행을 건너뛰기
    const skipTitles = ['입출금거래내역조회 결과', '거래내역조회 결과', '조회결과'];
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      let skipThisRow = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v).trim();
          if (skipTitles.some(title => cellValue.includes(title))) {
            if (r + 1 > dataStartRowIndex) {
              dataStartRowIndex = r + 1;
              console.log(`'${cellValue}' 행 건너뛰기: ${r + 1}행`);
              skipThisRow = true;
              break;
            }
          }
        }
      }
      if (skipThisRow) continue;
    }
    
    console.log(`데이터 시작 행: ${dataStartRowIndex + 1}`);
    
    // 첫 번째 데이터 행의 값을 기반으로 열 매핑 만들기
    const columnMapping: Record<string, string> = {};
    let hasDataRows = false;
    
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerCellAddress = xlsx.utils.encode_cell({ r: headerRowIndex, c });
      const headerCell = worksheet[headerCellAddress];
      if (headerCell && headerCell.v) {
        const headerValue = String(headerCell.v).trim();
        
        // 열 이름 매핑 (NH은행 거래내역 형식에 맞게)
        if (headerValue.includes('거래일자') || headerValue.includes('일자') || headerValue.includes('날짜')) {
          columnMapping[c] = '거래일자';
        } else if (headerValue.includes('출금') || headerValue.includes('인출') || headerValue.includes('출금액')) {
          columnMapping[c] = '출금금액';
        } else if (headerValue.includes('입금') || headerValue.includes('입금액')) {
          columnMapping[c] = '입금금액';
        } else if (headerValue.includes('잔액')) {
          columnMapping[c] = '잔액';
        } else if (headerValue.includes('적요') || headerValue.includes('내용') || headerValue.includes('거래내용')) {
          columnMapping[c] = '적요';
        } else if (headerValue.includes('거래점') || headerValue.includes('점명')) {
          columnMapping[c] = '거래점';
        } else if (headerValue.includes('시간') || headerValue.includes('거래시간')) {
          columnMapping[c] = '거래시간';
        } else if (headerValue.includes('메모') || headerValue.includes('이체메모')) {
          columnMapping[c] = '이체메모';
        } else {
          // 기타 열은 원래 헤더 이름 사용
          columnMapping[c] = headerValue;
        }
        
        console.log(`열 ${c + 1} (${String.fromCharCode(65 + c)}): '${headerValue}' -> '${columnMapping[c]}'`);
      }
    }
    
    // 데이터 행을 객체로 변환
    const records: Record<string, any>[] = [];
    
    for (let r = dataStartRowIndex; r <= range.e.r; r++) {
      const rowEmpty = isRowEmpty(worksheet, r, range.s.c, range.e.c);
      if (rowEmpty) {
        console.log(`행 ${r + 1}: 빈 행 건너뛰기`);
        continue;
      }
      
      const record: Record<string, any> = {};
      let hasData = false;
      
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          let cellValue = cell.v;
          const columnName = columnMapping[c];
          
          if (columnName) {
            // 날짜 값 처리
            if (columnName === '거래일자' && xlsx.SSF.is_date(cell)) {
              const dateNum = cell.v;
              if (typeof dateNum === 'number') {
                // 엑셀 날짜를 JS Date로 변환
                const jsDate = xlsx.SSF.parse_date_code(dateNum);
                const year = jsDate.y;
                const month = String(jsDate.m).padStart(2, '0');
                const day = String(jsDate.d).padStart(2, '0');
                cellValue = `${year}-${month}-${day}`;
                console.log(`날짜 변환: ${dateNum} -> ${cellValue}`);
              }
            }
            
            record[columnName] = cellValue;
            hasData = true;
          }
        }
      }
      
      if (hasData) {
        hasDataRows = true;
        records.push(record);
        if (records.length <= 3) { // 처음 3개 행만 디버깅
          console.log(`행 ${r + 1} 데이터:`, record);
        }
      }
    }
    
    if (!hasDataRows) {
      console.warn('유효한 데이터 행을 찾을 수 없습니다.');
    }
    
    console.log(`총 ${records.length}개의 데이터 레코드 추출`);
    
    // 처음 3개의 레코드 내용 확인
    records.slice(0, 3).forEach((record, index) => {
      console.log(`레코드 ${index + 1}:`, JSON.stringify(record));
    });
    
    return records;
  } catch (error) {
    console.error('엑셀 파싱 오류:', error);
    throw new Error('엑셀 파일 파싱 중 오류가 발생했습니다.');
  }
}

// 행이 비어있는지 확인하는 헬퍼 함수
function isRowEmpty(worksheet: xlsx.WorkSheet, rowIndex: number, startCol: number, endCol: number): boolean {
  for (let c = startCol; c <= endCol; c++) {
    const cellAddress = xlsx.utils.encode_cell({ r: rowIndex, c });
    const cell = worksheet[cellAddress];
    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
      return false;
    }
  }
  return true;
}

// CSV 파일 파싱 함수
function parseCSV(content: string) {
  try {
    // BOM 제거 (있는 경우)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    console.log('CSV 파싱 시작...');
    console.log('원본 데이터 샘플:', content.substring(0, 200));
    
    // CSV 파싱
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`파싱 결과: ${records.length}개 레코드 발견`);
    
    // 첫 번째 레코드의 열 이름 로깅
    if (records.length > 0) {
      console.log('CSV 파일의 모든 열 이름:', Object.keys(records[0]));
      
      // 각 열 이름 개별 출력 (공백, 특수문자 확인을 위해)
      Object.keys(records[0]).forEach((key, index) => {
        console.log(`열 ${index + 1}: '${key}' (길이: ${key.length})`);
      });
      
      // 첫 번째 레코드 데이터 샘플 출력
      console.log('첫 번째 레코드 데이터:', JSON.stringify(records[0]));
      
      // 열 이름 공백 및 특수문자 확인
      const sanitizedKeys: Record<string, string> = {};
      Object.keys(records[0]).forEach(key => {
        const sanitizedKey = key.trim().replace(/\s+/g, '');
        if (key !== sanitizedKey) {
          console.log(`열 이름에 공백/특수문자 발견: '${key}' -> '${sanitizedKey}'`);
          sanitizedKeys[key] = sanitizedKey;
        }
      });
      
      // 공백이나 특수문자가 있는 열 이름이 있으면 정리
      if (Object.keys(sanitizedKeys).length > 0) {
        console.log('열 이름 정리 수행...');
        records.forEach((record: Record<string, any>) => {
          Object.keys(sanitizedKeys).forEach(originalKey => {
            const sanitizedKey = sanitizedKeys[originalKey];
            record[sanitizedKey] = record[originalKey];
          });
        });
        console.log('열 이름 정리 완료');
      }
      
      // 날짜 필드 자동 감지 검증
      const possibleDateFields = [
        '거래일자', '거래일', '날짜', 'Date', '일자', 'TRN_DT', '거래_일자',
        'TRDD', '거래날짜', '이체일', '이체일자', '입금일자', '출금일자', 'date',
        '번호'
      ];
      
      const foundDateField = possibleDateFields.find(field => {
        // 정확한 필드명 매칭
        if (field in records[0]) return true;
        
        // 부분 매칭 (열 이름에 특정 텍스트 포함)
        for (const key of Object.keys(records[0])) {
          if (key.includes(field)) {
            console.log(`부분 일치하는 날짜 필드 발견: '${key}' (검색어: '${field}')`);
            return true;
          }
        }
        return false;
      });
      
      if (!foundDateField) {
        console.warn('⚠️ 경고: CSV 데이터에서 날짜 필드를 자동으로 찾을 수 없습니다.');
        console.log('사용 가능한 필드:', Object.keys(records[0]));
      } else {
        console.log(`✓ 날짜 필드 감지됨: "${foundDateField}"`);
      }
    }
    
    return records;
  } catch (error) {
    console.error('CSV 파싱 오류:', error);
    throw new Error('CSV 파일 파싱 중 오류가 발생했습니다.');
  }
}

// Notion 데이터베이스에서 기존 트랜잭션 가져오기
async function getExistingTransactions() {
  try {
    const response = await notionClient.databases.query({
      database_id: TRANSACTIONS_DB_ID,
      filter: {
        property: "date",
        date: {
          is_not_empty: true,
        },
      },
    });
    
    return response.results.map((page: any) => ({
      id: page.id,
      date: page.properties.date?.date?.start,
      in: page.properties.in?.number || 0,
      out: page.properties.out?.number || 0,
      balance: page.properties.balance?.number || 0,
      description: page.properties.description?.rich_text?.[0]?.plain_text || '',
      branch: page.properties.branch?.rich_text?.[0]?.plain_text || '',
      bank: page.properties.bank?.rich_text?.[0]?.plain_text || '',
    }));
  } catch (error) {
    console.error('Notion 데이터베이스 쿼리 오류:', error);
    throw new Error('Notion 데이터베이스 조회 중 오류가 발생했습니다.');
  }
}

// 날짜 포맷 변환 (yyyy.mm.dd -> ISO8601)
function formatDateTime(dateStr: string | number | any): string | null {
  if (dateStr === undefined || dateStr === null) {
    console.log('날짜 문자열이 비어 있음');
    return null;
  }
  
  console.log(`날짜 변환 시도: '${dateStr}'`);
  
  // 숫자 형식 날짜인 경우 (엑셀 날짜 숫자)
  if (typeof dateStr === 'number') {
    try {
      // Excel 날짜 숫자를 JS Date로 변환
      const jsDate = xlsx.SSF.parse_date_code(dateStr);
      if (jsDate && jsDate.y) {
        const isoDate = `${jsDate.y}-${String(jsDate.m).padStart(2, '0')}-${String(jsDate.d).padStart(2, '0')}`;
        console.log(`엑셀 숫자 날짜 변환: ${dateStr} -> ${isoDate}`);
        return isoDate;
      }
    } catch (e) {
      console.error(`엑셀 날짜 숫자 변환 오류: ${dateStr}`, e);
    }
  }
  
  // 날짜 문자열이 객체인 경우 문자열로 변환
  if (typeof dateStr === 'object') {
    try {
      dateStr = String(dateStr);
      console.log(`객체를 문자열로 변환: '${dateStr}'`);
    } catch (e) {
      console.error('날짜 객체를 문자열로 변환 중 오류:', e);
      return null;
    }
  }
  
  // 문자열 형식으로 변환
  const dateString = String(dateStr);
  
  // 다양한 날짜 형식 처리
  let formattedDate: string;
  
  // 정규식 패턴 확장
  // yyyy.mm.dd 형식
  if (/^\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}$/.test(dateString)) {
    // 구분자를 추출하여 일관되게 처리
    const separator = dateString.match(/[.\/\-]/)?.[0] || '.';
    const parts = dateString.split(separator);
    formattedDate = `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    console.log(`yyyy${separator}mm${separator}dd 형식 변환: ${dateString} -> ${formattedDate}`);
  }
  // dd.mm.yyyy 형식
  else if (/^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{4}$/.test(dateString)) {
    const separator = dateString.match(/[.\/\-]/)?.[0] || '.';
    const parts = dateString.split(separator);
    formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    console.log(`dd${separator}mm${separator}yyyy 형식 변환: ${dateString} -> ${formattedDate}`);
  }
  // yyyymmdd 형식 (구분자 없음)
  else if (/^\d{8}$/.test(dateString)) {
    formattedDate = `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
    console.log(`yyyymmdd 형식 변환: ${dateString} -> ${formattedDate}`);
  }
  // 기타 형식
  else {
    try {
      // 다양한 날짜 형식 처리를 위한 추가 시도
      // 한국어 날짜 형식 (예: 2023년 1월 1일)
      if (/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(dateString)) {
        const matches = dateString.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (matches) {
          formattedDate = `${matches[1]}-${matches[2].padStart(2, '0')}-${matches[3].padStart(2, '0')}`;
          console.log(`한국어 날짜 형식 변환: ${dateString} -> ${formattedDate}`);
          return formattedDate;
        }
      }
      
      // 날짜만 포함된 문자열 추출 시도
      const dateMatch = dateString.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
      if (dateMatch) {
        const extractedDate = dateMatch[0].replace(/[/.]/g, '-');
        console.log(`문자열에서 날짜 추출: ${dateString} -> ${extractedDate}`);
        
        // 추출된 날짜 검증
        const testDate = new Date(extractedDate);
        if (!isNaN(testDate.getTime())) {
          return extractedDate;
        }
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error(`유효하지 않은 날짜 형식: ${dateString}`);
        return null;
      }
      formattedDate = date.toISOString().split('T')[0];
      console.log(`기타 날짜 형식 변환: ${dateString} -> ${formattedDate}`);
    } catch (e) {
      console.error(`날짜 변환 오류: ${dateString}`, e);
      return null;
    }
  }
  
  // 변환된 날짜 유효성 검사
  try {
    const testDate = new Date(formattedDate);
    if (isNaN(testDate.getTime())) {
      console.error(`변환된 날짜가 유효하지 않음: ${formattedDate}`);
      return null;
    }
  } catch (e) {
    console.error(`변환된 날짜 검증 오류: ${formattedDate}`, e);
    return null;
  }
  
  return formattedDate;
}

// 날짜와 시간 조합하여 ISO 8601 형식으로 변환
function combineDateAndTime(date: string | number | null | undefined, time: string | number | null | undefined): string | undefined {
  if (!date) return undefined;
  
  const dateStr = String(date);
  let timeStr = time ? String(time) : '';
  
  // 날짜 형식 변환
  let formattedDate = '';
  if (dateStr.includes('-')) {
    formattedDate = dateStr;
  } else if (dateStr.includes('/')) {
    const [year, month, day] = dateStr.split('/');
    formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (dateStr.length === 8) {
    formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  } else {
    return undefined;
  }

  // 시간 형식 변환
  if (timeStr) {
    timeStr = timeStr.replace(/[^0-9]/g, '');
    if (timeStr.length >= 4) {
      const hours = timeStr.slice(0, 2);
      const minutes = timeStr.slice(2, 4);
      timeStr = `${hours}:${minutes}`;
    }
  }

  // 날짜와 시간 조합
  return timeStr ? `${formattedDate}T${timeStr}:00.000Z` : `${formattedDate}T00:00:00.000Z`;
}

// CSV 레코드를 Notion 형식으로 변환
function transformRecord(record: Record<string, any>) {
  console.log('레코드 변환 중...');
  console.log('원본 레코드:', JSON.stringify(record));
  
  // 모든 키 출력 (공백, 대소문자 확인)
  console.log('레코드 키 목록:');
  Object.keys(record).forEach(key => {
    console.log(`- '${key}': ${typeof record[key]} = '${record[key]}'`);
  });
  
  // 필드 이름 정규화 - 공백 제거 및 소문자 변환
  const normalizedRecord: Record<string, any> = {};
  Object.keys(record).forEach(key => {
    const normalizedKey = key.trim().toLowerCase();
    normalizedRecord[normalizedKey] = record[key];
  });
  
  // 정규화된 레코드에서 날짜 필드 추출 (원본 필드명도 유지)
  for (const key of Object.keys(record)) {
    normalizedRecord[key] = record[key];
  }
  
  // CSV 파일의 컬럼명에 따라 매핑 조정 - 더 많은 가능한 열 이름 추가
  // 원본 키 및 정규화된 키 모두 검색
  
  // NH은행 거래내역은 일반적으로 '거래일자' 열을 사용
  const dateField = 
    (record['거래일자'] as string | undefined) || (normalizedRecord['거래일자'] as string | undefined) ||
    (record['거래일'] as string | undefined) || (normalizedRecord['거래일'] as string | undefined) ||
    (record['날짜'] as string | undefined) || (normalizedRecord['날짜'] as string | undefined) ||
    (record['Date'] as string | undefined) || (normalizedRecord['date'] as string | undefined) ||
    (record['일자'] as string | undefined) || (normalizedRecord['일자'] as string | undefined) ||
    (record['TRN_DT'] as string | undefined) || (normalizedRecord['trn_dt'] as string | undefined) ||
    (record['거래_일자'] as string | undefined) || (normalizedRecord['거래_일자'] as string | undefined) ||
    (record['TRDD'] as string | undefined) || (normalizedRecord['trdd'] as string | undefined) ||
    (record['거래날짜'] as string | undefined) || (normalizedRecord['거래날짜'] as string | undefined) ||
    (record['이체일'] as string | undefined) || (normalizedRecord['이체일'] as string | undefined) ||
    (record['이체일자'] as string | undefined) || (normalizedRecord['이체일자'] as string | undefined) ||
    (record['입금일자'] as string | undefined) || (normalizedRecord['입금일자'] as string | undefined) ||
    (record['출금일자'] as string | undefined) || (normalizedRecord['출금일자'] as string | undefined);
                 
  // 엑셀에서 번호 열이 날짜인 경우도 확인
  let possibleDate = dateField;
  
  // NH 은행 거래내역 특수 처리: 번호 필드가 날짜인 경우
  if (!possibleDate && ((record['번호'] as string | undefined) || (normalizedRecord['번호'] as string | undefined))) {
    const numField = (record['번호'] as string) || (normalizedRecord['번호'] as string);
    if (typeof numField === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(numField)) {
      possibleDate = numField;
      console.log(`번호 필드에서 날짜 형식 발견: ${possibleDate}`);
    }
  }
  
  // 'B' 열이 거래일자인 경우 (엑셀에서 내보낸 NH은행 거래내역)
  if (!possibleDate && ((record['B'] as string | undefined) || (normalizedRecord['b'] as string | undefined))) {
    const bField = (record['B'] as string) || (normalizedRecord['b'] as string);
    console.log(`B 열 값 확인: ${bField}, 타입: ${typeof bField}`);
    if (typeof bField === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bField)) {
      possibleDate = bField;
      console.log(`B 열에서 날짜 형식 발견: ${possibleDate}`);
    }
  }
  
  // 엑셀 날짜 번호 형식 처리
  if (!possibleDate) {
    // '거래날짜' 필드 이름이 있는지 확인 (부분 일치 포함)
    for (const key in record) {
      if (key.includes('날짜') || key.includes('일자') || key.includes('date') || 
          key.includes('Date') || key === '번호' || key === 'B') {
        if (record[key]) {
          console.log(`날짜로 추정되는 필드 발견 - ${key}: ${record[key]}`);
          possibleDate = record[key];
          break;
        }
      }
    }
  }
  
  // 레코드의 첫 번째 또는 두 번째 필드가 날짜 형식인지 확인
  if (!possibleDate) {
    const keys = Object.keys(record);
    if (keys.length > 1) {
      const firstValue = record[keys[0]];
      const secondValue = record[keys[1]];
      
      if (typeof firstValue === 'string' && /\d{4}[-/.]\d{2}[-/.]\d{2}/.test(firstValue)) {
        console.log(`첫 번째 필드(${keys[0]})에서 날짜 형식 발견: ${firstValue}`);
        possibleDate = firstValue;
      } else if (typeof secondValue === 'string' && /\d{4}[-/.]\d{2}[-/.]\d{2}/.test(secondValue)) {
        console.log(`두 번째 필드(${keys[1]})에서 날짜 형식 발견: ${secondValue}`);
        possibleDate = secondValue;
      }
    }
  }
  
  const timeField = 
    (record['거래시간'] as string | undefined) || (normalizedRecord['거래시간'] as string | undefined) ||
    (record['시간'] as string | undefined) || (normalizedRecord['시간'] as string | undefined) ||
    (record['Time'] as string | undefined) || (normalizedRecord['time'] as string | undefined) ||
    (record['거래_시간'] as string | undefined) || (normalizedRecord['거래_시간'] as string | undefined) ||
    (record['TRN_TM'] as string | undefined) || (normalizedRecord['trn_tm'] as string | undefined) ||
    (record['TRNTIME'] as string | undefined) || (normalizedRecord['trntime'] as string | undefined);
  
  console.log(`날짜 필드: "${possibleDate}", 시간 필드: "${timeField}"`);
  
  // 금액 문자열 정리 및 숫자로 변환
  const parseAmount = (amountStr?: string | number) => {
    if (amountStr === undefined || amountStr === null) return 0;
    
    // 이미 숫자인 경우
    if (typeof amountStr === 'number') {
      console.log(`숫자 금액 변환: ${amountStr}`);
      return Math.round(amountStr);  // 소수점 제거
    }
    
    // 문자열인 경우
    if (typeof amountStr === 'string') {
      if (amountStr.trim() === '' || amountStr === '0') return 0;
      
      // 쉼표, 원 기호, 공백 제거
      const cleaned = amountStr.replace(/[,원\s]/g, '');
      let parsed = 0;
      
      try {
        parsed = parseInt(cleaned, 10);
      } catch (e) {
        console.error(`금액 변환 오류: '${amountStr}' -> '${cleaned}'`, e);
      }
      
      console.log(`문자열 금액 변환: '${amountStr}' -> '${cleaned}' -> ${parsed}`);
      return parsed || 0;
    }
    
    // 기타 타입
    console.warn(`지원되지 않는 금액 타입: ${typeof amountStr}, 값: ${amountStr}`);
    return 0;
  };
  
  // 입금/출금 필드 매핑 - 더 많은 가능한 열 이름 추가
  const inField = 
    record['입금금액(원)'] || record['입금'] || record['입금액'] || record['In'] ||
    record['입금금액'] || record['CREDIT'] || record['입금_금액'] ||
    record['Credit'] || record['credit'] || record['입금액(원)'] ||
    record['deposit'] || record['Deposit'] || normalizedRecord['입금'] ||
    normalizedRecord['입금액'] || normalizedRecord['입금금액'];
                
  const outField = 
    record['출금금액(원)'] || record['출금'] || record['출금액'] || record['Out'] ||
    record['출금금액'] || record['DEBIT'] || record['출금_금액'] ||
    record['Debit'] || record['debit'] || record['출금액(원)'] || 
    record['withdrawal'] || record['Withdrawal'] || normalizedRecord['출금'] ||
    normalizedRecord['출금액'] || normalizedRecord['출금금액'];
  
  console.log(`입금 필드: ${inField} (${typeof inField}), 출금 필드: ${outField} (${typeof outField})`);
  
  // 추가로 금액(amount) 필드가 있는 경우 검사
  const amountField = 
    record['금액'] || record['Amount'] || record['거래금액'] || 
    record['AMOUNT'] || record['거래_금액'] || record['금액(원)'] ||
    normalizedRecord['금액'] || normalizedRecord['amount'];
                    
  if (amountField && !inField && !outField) {
    console.log(`금액 필드 발견: "${amountField}" (${typeof amountField})`);
    // 양수면 입금, 음수면 출금으로 처리
    const amount = parseAmount(amountField);
    if (amount > 0) {
      record['입금'] = amountField;
      console.log(`금액 ${amount}을(를) 입금으로 처리`);
    } else if (amount < 0) {
      record['출금'] = Math.abs(amount).toString();
      console.log(`금액 ${amount}을(를) 출금으로 처리`);
    }
  }
  
  // 기타 필드 매핑 - 더 많은 가능한 열 이름 추가
  const balanceField = 
    record['거래 후 잔액(원)'] || record['잔액'] || record['Balance'] ||
    record['후잔액'] || record['거래후잔액'] || record['BAL'] || record['잔액_금액'] ||
    record['잔액(원)'] || record['balance'] || normalizedRecord['잔액'] ||
    normalizedRecord['balance'];
                     
  const descriptionField = 
    record['거래기록사항'] || record['내용'] || record['적요'] || record['Description'] ||
    record['거래내용'] || record['DESC'] || record['REMARK'] || record['CONTENT'] || record['비고'] ||
    record['description'] || record['memo'] || record['적요내용'] || record['거래적요'] ||
    normalizedRecord['적요'] || normalizedRecord['내용'] || normalizedRecord['거래내용'];
                         
  const branchField = 
    record['거래점'] || record['Branch'] || record['점명'] || record['점'] || record['BRANCH_NM'] ||
    record['branch'] || record['거래지점'] || record['지점명'] || record['branch_name'] ||
    normalizedRecord['거래점'] || normalizedRecord['지점'];
  
  const bankField = 
    record['거래내용'] || record['은행'] || record['Bank'] || record['BANK_NM'] ||
    record['거래은행'] || record['거래_은행'] || record['bank'] || record['은행명'] ||
    normalizedRecord['은행'] || normalizedRecord['bank'];
                  
  const memoField = 
    record['이체메모'] || record['메모'] || record['Memo'] || record['비고'] || record['MEMO'] ||
    record['memo'] || record['메모사항'] || normalizedRecord['이체메모'] || 
    normalizedRecord['메모'];
  
  console.log(`잔액 필드: "${balanceField}", 내용 필드: "${descriptionField}"`);
  console.log(`거래점 필드: "${branchField}", 은행 필드: "${bankField}"`);
  
  // 날짜 포맷 확인
  let formattedDate = null;
  if (possibleDate) {
    // 날짜 형식 디버깅 로그
    console.log(`원본 날짜: "${possibleDate}", 형식: ${typeof possibleDate}`);
    
    // NH 은행 거래내역에서는 'yyyy-mm-dd' 형식으로 일반적으로 제공됨
    if (typeof possibleDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(possibleDate)) {
      formattedDate = possibleDate; // 이미 올바른 ISO 형식
      console.log(`이미 올바른 ISO 형식: ${formattedDate}`);
    } else {
      // 다양한 날짜 형식 시도
      formattedDate = formatDateTime(possibleDate);
    }
    
    // 날짜 변환 결과 로그
    console.log(`변환된 날짜: ${formattedDate}`);
    
    if (!formattedDate) {
      console.error(`⚠️ 날짜 변환 실패: "${possibleDate}". 레코드가 처리되지 않을 수 있습니다.`);
    }
  } else {
    console.error('⚠️ 심각한 오류: 날짜 필드를 찾을 수 없음. 해당 레코드는 처리되지 않습니다.');
    console.error('가용 필드:', Object.keys(record));
  }
  
  const transformedRecord = {
    date: combineDateAndTime(formattedDate, timeField) || undefined,
    in: parseAmount(inField),
    out: parseAmount(outField),
    balance: parseAmount(balanceField),
    description: typeof descriptionField === 'string' ? descriptionField : String(descriptionField || ''),
    branch: typeof branchField === 'string' ? branchField : String(branchField || ''),
    bank: typeof bankField === 'string' ? bankField : String(bankField || ''),
    memo: typeof memoField === 'string' ? memoField : String(memoField || '')
  };
  
  return transformedRecord;
}

// 중복 트랜잭션 필터링
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

// Notion에 트랜잭션 저장
async function saveTransactionsToNotion(transactions: any[]): Promise<any[]> {
  const savedTransactions: any[] = [];
  
  console.log(`저장 시도할 트랜잭션: ${transactions.length}개`);
  
  if (transactions.length === 0) {
    console.log('저장할 트랜잭션이 없습니다.');
    return savedTransactions;
  }
  
  for (const tx of transactions) {
    if (!tx.date) {
      console.log('날짜가 없는 트랜잭션 스킵:', JSON.stringify(tx, null, 2));
      continue; // 날짜가 없는 경우 스킵
    }
    
    try {
      const properties: any = {
        date: {
          type: 'date',
          date: { 
            start: tx.date,
            time_zone: "Asia/Seoul"
          },
        },
        in: {
          type: 'number',
          number: tx.in,
        },
        out: {
          type: 'number',
          number: tx.out,
        },
        balance: {
          type: 'number',
          number: tx.balance,
        },
        description: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: tx.description } }],
        },
        branch: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: tx.branch } }],
        },
        bank: {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: tx.bank } }],
        },
      };
      
      // 이체메모가 있는 경우 추가
      if (tx.memo) {
        properties.memo = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: tx.memo } }],
        };
      }
      
      console.log('트랜잭션 저장 시도:', JSON.stringify({
        date: tx.date,
        in: tx.in,
        out: tx.out,
        description: tx.description.substring(0, 30) + (tx.description.length > 30 ? '...' : '')
      }, null, 2));
      
      const response = await notionClient.pages.create({
        parent: { database_id: TRANSACTIONS_DB_ID },
        properties: properties,
      });
      
      console.log('저장 성공:', response.id);
      savedTransactions.push(response);
    } catch (error) {
      console.error('트랜잭션 저장 오류:', error);
      console.error('저장 실패한 트랜잭션:', JSON.stringify(tx, null, 2));
    }
  }
  
  return savedTransactions;
}

export async function POST(request: Request) {
  try {
    console.log('파일 업로드 요청 시작');
    
    // FormData에서 파일 가져오기
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      console.error('유효한 파일이 제공되지 않음');
      return NextResponse.json({
        success: false,
        error: '유효한 파일이 제공되지 않았습니다.',
      }, { status: 400 });
    }
    
    console.log(`파일 수신: ${file.name}, 크기: ${file.size} 바이트, 타입: ${file.type}`);
    
    // 파일 확장자 확인
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    console.log(`파일 확장자: ${fileExt}`);
    
    let records: any[] = [];
    
    // 파일 유형에 따라 적절한 파서 사용
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      // 엑셀 파일 처리
      records = await parseExcel(file);
    } else if (fileExt === 'csv') {
      // CSV 파일 처리
      const fileContent = await file.text();
      console.log(`파일 내용 크기: ${fileContent.length} 바이트`);
      console.log(`파일 내용 시작 부분: ${fileContent.substring(0, 100)}...`);
      console.log(`파일 줄 수: ${fileContent.split('\n').length}`);
      
      records = parseCSV(fileContent);
    } else {
      console.error(`지원되지 않는 파일 형식: ${fileExt}`);
      return NextResponse.json({
        success: false,
        error: '지원되는 파일 형식은 CSV, XLSX, XLS입니다.',
      }, { status: 400 });
    }
    
    console.log(`파일에서 ${records.length}개의 레코드를 파싱했습니다.`);
    
    if (records.length === 0) {
      console.error('파일에서 파싱된 레코드가 없음');
      return NextResponse.json({
        success: false,
        error: '파싱된 레코드가 없습니다. 파일 형식을 확인해주세요.',
      }, { status: 400 });
    }
    
    // 첫 번째 및 두 번째 열 이름 확인 (엑셀 파일에서 자주 사용되는 패턴)
    if (records.length > 0) {
      const keys = Object.keys(records[0]);
      console.log('레코드의 모든 키:', keys);
      
      // 열 이름이 숫자나 알파벳 한 글자인 경우 (엑셀 기본 열 이름)
      if (keys.length > 1 && keys.some(key => /^[A-Z]$/.test(key) || /^\d+$/.test(key))) {
        console.log('엑셀 기본 열 이름 감지됨, 첫 행을 실제 헤더로 사용할 수 있음');
        
        // 첫 번째와 두 번째 열 검사 (일반적인 NH 은행 형식)
        if (keys.includes('A') && keys.includes('B')) {
          const firstRecord = records[0];
          
          // B 열이 날짜인지 확인 (2025-04-03 형식)
          if (typeof firstRecord['B'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(firstRecord['B'])) {
            console.log(`B 열이 날짜 형식임: ${firstRecord['B']}`);
            
            // 열 이름 매핑
            console.log('NH 은행 거래내역 형식으로 열 이름 매핑 시도...');
            records.forEach(record => {
              record['거래일자'] = record['B'];  // 거래일자
              record['출금금액'] = record['C'];  // 출금금액
              record['입금금액'] = record['D'];  // 입금금액
              record['잔액'] = record['E'];      // 잔액
              record['적요'] = record['F'];      // 적요(거래내용)
              record['거래점'] = record['G'];    // 거래점
              record['거래시간'] = record['H'];  // 거래시간
              if ('I' in record) {
                record['이체메모'] = record['I']; // 이체메모
              }
            });
            console.log('열 이름 매핑 완료');
          }
        }
      }
    }
    
    // 첫 몇 개의 레코드만 샘플로 변환 (디버깅 목적)
    const sampleSize = Math.min(3, records.length);
    console.log(`샘플 ${sampleSize}개 레코드 변환 테스트:`);
    const sampleResults = [];
    for (let i = 0; i < sampleSize; i++) {
      const transformed = transformRecord(records[i]);
      sampleResults.push(transformed);
      console.log(`샘플 ${i+1} 변환 결과:`, transformed);
      if (!transformed.date) {
        console.error(`⚠️ 샘플 ${i+1}의 날짜 변환 실패! 이 레코드는 처리되지 않을 것입니다.`);
        console.error('원본 레코드:', records[i]);
      }
    }
    
    // 날짜 필드 변환 실패 확인
    const anyDateMissing = sampleResults.some(record => !record.date);
    if (anyDateMissing) {
      console.warn('⚠️ 경고: 일부 샘플 레코드에서 날짜 필드를 변환하지 못했습니다.');
      console.warn('파일의 날짜 형식을 확인해주세요. 지원되는 형식: YYYY-MM-DD, YYYY.MM.DD, DD.MM.YYYY 등');
    }
    
    // 서버 재시작 후 첫 업로드인 경우 응급 처리 (사용자 경험 개선)
    // 첫 레코드의 날짜 필드를 '거래일자'로 강제 매핑 시도
    if (anyDateMissing) {
      console.log('날짜 필드 변환 실패 - 응급 처리 시도 중');
      
      // 방법 1: 'B' 필드 검사
      if (records.length > 0 && 'B' in records[0]) {
        console.log(`'B' 필드 발견: ${records[0]['B']}`);
        // 'B' 필드가 날짜 형식인지 확인
        if (typeof records[0]['B'] === 'string' && /\d{4}-\d{2}-\d{2}/.test(records[0]['B'])) {
          console.log(`'B' 필드에서 날짜 발견: ${records[0]['B']}`);
          // 모든 레코드에 '거래일자' 필드 추가
          records.forEach((record: Record<string, any>) => {
            record['거래일자'] = record['B'];
          });
          console.log("'B' 필드를 '거래일자'로 매핑했습니다.");
        }
      }
      
      // 방법 2: 두 번째 열 검사 (엑셀 열 순서 기반)
      else if (records.length > 0) {
        const keys = Object.keys(records[0]);
        if (keys.length > 1) {
          const secondKey = keys[1]; // 두 번째 열 키
          const secondValue = records[0][secondKey];
          
          if (typeof secondValue === 'string' && /\d{4}[-/.]\d{2}[-/.]\d{2}/.test(secondValue)) {
            console.log(`두 번째 열(${secondKey})에서 날짜 발견: ${secondValue}`);
            // 모든 레코드에 '거래일자' 필드 추가
            records.forEach((record: Record<string, any>) => {
              record['거래일자'] = record[secondKey];
            });
            console.log(`'${secondKey}' 필드를 '거래일자'로 매핑했습니다.`);
          }
        }
      }
    }
    
    // 전체 레코드 변환
    console.log('전체 레코드 변환 시작...');
    const transformedRecords = records.map(transformRecord);
    console.log(`${transformedRecords.length}개 레코드 변환 완료`);
    
    // 날짜 없는 레코드 필터링
    const validRecords = transformedRecords.filter((record: any) => {
      if (!record.date) {
        return false;
      }
      return true;
    });
    
    console.log(`유효한 레코드: ${validRecords.length}/${transformedRecords.length}`);
    
    if (validRecords.length === 0) {
      console.error('유효한 날짜를 가진 레코드가 없음');
      
      // 디버깅 정보 추가
      const diagnostics = {
        fileSize: file.size,
        recordCount: records.length,
        fileType: file.type,
        fileExtension: fileExt,
        sampleRecord: records.length > 0 ? JSON.stringify(records[0]) : null,
        columns: records.length > 0 ? Object.keys(records[0]) : [],
        error: '파일의 날짜 필드를 인식할 수 없습니다.'
      };
      
      return NextResponse.json({
        success: false,
        error: '유효한 날짜를 가진 레코드가 없습니다. 파일 형식을 확인해주세요.',
        diagnostics
      }, { status: 400 });
    }
    
    // 기존 트랜잭션 가져오기
    console.log('기존 트랜잭션 조회 중...');
    const existingTransactions = await getExistingTransactions();
    
    // 중복 제거
    console.log('중복 트랜잭션 필터링 중...');
    const newTransactions = filterDuplicates(validRecords, existingTransactions);
    console.log(`${newTransactions.length}개의 새로운 트랜잭션을 발견했습니다.`);
    
    // Notion에 저장
    console.log('Notion DB에 트랜잭션 저장 시작...');
    const savedTransactions = await saveTransactionsToNotion(newTransactions);
    console.log(`${savedTransactions.length}개의 트랜잭션을 Notion에 저장했습니다.`);
    
    return NextResponse.json({
      success: true,
      totalRecords: records.length,
      validRecords: validRecords.length,
      invalidRecords: transformedRecords.length - validRecords.length,
      newTransactions: savedTransactions.length,
    });
  } catch (error: any) {
    console.error('파일 업로드 오류:', error);
    console.error('스택 트레이스:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || '트랜잭션 업로드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
} 