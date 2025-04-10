import { Client } from '@notionhq/client';

// Notion API 키를 직접 명시적으로 설정
export const NOTION_API_KEY = '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';

// 기존 변수명을 유지하면서 데이터베이스 ID 설정
export const MEMBER_DB_ID = '1c47c9ec-930b-8057-bbd9-f8b6708a0294';
export const FEE_DB_ID = '1c47c9ec-930b-8018-a42b-d84fd02124df';
export const MASTER_DB_ID = '1c57c9ec930b803785d5d88539c20a21';
export const SERVICE_FEE_DB_ID = '1c47c9ec930b805fa2afe3716f9d7544';

// 특별회비 관련 데이터베이스 ID
export const SPECIAL_EVENTS_DB_ID = '1c47c9ec930b80f8a459f14ff17b32b6';
export const SPECIAL_FEES_DB_ID = '1c47c9ec930b800e85ebc172be283abe';

// 기부 관련 데이터베이스 ID
export const DONATIONS_DB_ID = '1c47c9ec930b80d88b18c578d7cc9f4a';

// 공지사항 데이터베이스 ID
export const NOTICES_DB_ID = '1ce7c9ec930b806e8072f89453929858'; // 임시 ID, 실제 DB 생성 후 변경 필요

// 입출금 거래내역 데이터베이스 ID
export const TRANSACTIONS_DB_ID = '1cf7c9ec930b802584eaf3b2628a864d';

// 데이터베이스 ID를 객체로 정리 (새로운 방식)
export const DATABASE_IDS = {
  MEMBERS: MEMBER_DB_ID,
  FEES: FEE_DB_ID,
  SERVICE_FEES: SERVICE_FEE_DB_ID,
  SPECIAL_EVENTS: SPECIAL_EVENTS_DB_ID,
  SPECIAL_FEES: SPECIAL_FEES_DB_ID,
  MASTER_INFO: MASTER_DB_ID,
  DONATIONS: DONATIONS_DB_ID,
  NOTICES: NOTICES_DB_ID,
  TRANSACTIONS: TRANSACTIONS_DB_ID
} as const;

// Notion 클라이언트 인스턴스 생성 (새로운 변수명)
export const notionClient = new Client({
  auth: NOTION_API_KEY
});

// 기존 클라이언트 인스턴스 (호환성 유지)
export const notion = notionClient;

// 특별회비 금액 (만약 마스터 정보 DB에서 가져오지 못할 경우의 기본값)
export const DEFAULT_SPECIAL_EVENT_FEE = 20000;