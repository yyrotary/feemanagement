/**
 * Notion 데이터베이스 속성(Properties) 인터페이스 정의
 * 
 * 이 파일은 Notion API와 상호작용하는 다양한 API 엔드포인트에서 
 * 공통으로 사용하는 인터페이스 타입을 중앙화하여 관리합니다.
 */

/**
 * Notion 회원 데이터베이스 속성
 */
export interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  // 닉네임 필드 (일부 API에서는 Nickname, 다른 API에서는 nick으로 사용)
  Nickname?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  nick?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  // 공제 필드 (있는 경우)
  deduction?: {
    multi_select: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
}

/**
 * Notion 회비 데이터베이스 속성
 */
export interface NotionFeeProperties {
  date: {
    date: {
      start: string;
    };
  };
  paid_fee: {
    number: number;
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
  };
}

/**
 * Notion 거래내역 데이터베이스 속성
 */
export interface NotionTransactionProperties {
  date: {
    date: {
      start: string;
    };
  };
  in: {
    number: number;
  };
  out: {
    number: number;
  };
  balance: {
    number: number;
  };
  description: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  branch?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  bank?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  memo?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  relatedmember?: {
    relation: Array<{
      id: string;
    }>;
  };
}

/**
 * Notion 특별회비 이벤트 데이터베이스 속성
 */
export interface NotionSpecialEventProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  date: {
    date: {
      start: string;
    };
  };
  events: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  isPersonal: {
    checkbox: boolean;
  };
}

/**
 * Notion 기부 데이터베이스 속성
 */
export interface NotionDonationProperties {
  date: {
    date: {
      start: string;
    };
  };
  paid_fee: {
    number: number;
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
  };
  class: {
    multi_select: Array<{
      name: string;
    }>;
  };
  from_friend?: {
    relation: Array<{
      id: string;
    }>;
  };
  memo?: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
} 