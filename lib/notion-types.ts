/**
 * Notion 데이터베이스 API 응답 타입 정의
 * 모든 API에서 공통으로 사용할 인터페이스를 정의합니다.
 */

/**
 * 회원 데이터베이스 속성
 */
export interface NotionMemberProperties {
  // 기본 정보
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  nick?: {  // 닉네임 (Nickname) - 옵션
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  phone?: {  // 전화번호
    number: number;
  };
  joinDate?: {  // 가입일
    date: {
      start: string;
    };
  };
  
  // 회비 관련
  memberfee?: {  // 회비
    number: number;
  };
  paid_fee?: {  // 납부한 회비 (롤업)
    rollup: {
      number: number;
    };
  };
  unpaid_fee?: {  // 미납 회비 (공식)
    formula: {
      number: number;
    };
  };
  
  // 관계형 필드
  fee?: {  // 회비 관계
    relation: Array<{
      id: string;
    }>;
  };
  specialevent?: {  // 특별행사 관계
    relation: Array<{
      id: string;
    }>;
  };
  specialfee?: {  // 특별회비 관계
    relation: Array<{
      id: string;
    }>;
  };
  입출금내역?: {  // 거래내역 관계
    relation: Array<{
      id: string;
    }>;
  };
  기부?: {  // 기부 관계
    relation: Array<{
      id: string;
    }>;
  };
  기부1?: {  // 기부1 관계
    relation: Array<{
      id: string;
    }>;
  };
  donation?: {  // 기부 관계
    relation: Array<{
      id: string;
    }>;
  };
  봉사금?: {  // 봉사금 관계
    relation: Array<{
      id: string;
    }>;
  };
  
  // 기타
  deduction?: {  // 공제 항목 (선택)
    multi_select: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  총기부금?: {  // 총 기부금 (롤업)
    rollup: {
      number: number;
    };
  };
  우정기부?: {  // 우정 기부 (롤업)
    rollup: {
      number: number;
    };
  };
  기여도?: {  // 기여도 (공식)
    formula: {
      number: number;
    };
  };
}

/**
 * 회비 데이터베이스 속성
 */
export interface NotionFeeProperties {
  id: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  name: {  // 회원 관계
    relation: Array<{
      id: string;
    }>;
  };
  transactions: {  // 거래내역 관계
    relation: Array<{
      id: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  paid_fee: {  // 납부 금액
    number: number;
  };
  method: {  // 납부 방법
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
}

/**
 * 기부금 데이터베이스 속성
 */
export interface NotionDonationProperties {
  이름: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  name: {  // 회원 관계
    relation: Array<{
      id: string;
    }>;
  };
  기부: {  // 기부 관계
    relation: Array<{
      id: string;
    }>;
  };
  from_friend: {  // 친구 관계
    relation: Array<{
      id: string;
    }>;
  };
  transactions: {  // 거래내역 관계
    relation: Array<{
      id: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  paid_fee: {  // 납부 금액
    number: number;
  };
  method: {  // 납부 방법
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
  class: {  // 기부 종류
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
}

/**
 * 봉사금 데이터베이스 속성
 */
export interface NotionServiceFeeProperties {
  id: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  name: {  // 회원 관계
    relation: Array<{
      id: string;
    }>;
  };
  transactions: {  // 거래내역 관계
    relation: Array<{
      id: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  paid_fee: {  // 납부 금액
    number: number;
  };
  method: {  // 납부 방법
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
}

/**
 * 특별행사 데이터베이스 속성
 */
export interface NotionSpecialEventProperties {
  이름: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  name: {  // 회원 관계
    relation: Array<{
      id: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  events: {  // 행사 종류
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
  nick: {  // 닉네임 (롤업)
    rollup: {
      array: Array<{
        rich_text: Array<{
          plain_text: string;
        }>;
      }>;
    };
  };
}

/**
 * 특별회비 데이터베이스 속성
 */
export interface NotionSpecialFeeProperties {
  이름: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  name: {  // 회원 관계
    relation: Array<{
      id: string;
    }>;
  };
  transactions: {  // 거래내역 관계
    relation: Array<{
      id: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  paid_fee: {  // 납부 금액
    number: number;
  };
  method: {  // 납부 방법
    multi_select: Array<{
      name: string;
      id?: string;
      color?: string;
    }>;
  };
}

/**
 * 거래내역 데이터베이스 속성
 */
export interface NotionTransactionProperties {
  Name: {  // 제목 속성
    title: Array<{
      plain_text: string;
    }>;
  };
  date: {  // 날짜
    date: {
      start: string;
    };
  };
  description: {  // 적요
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  in: {  // 입금액
    number: number;
  };
  out: {  // 출금액
    number: number;
  };
  balance: {  // 잔액
    number: number;
  };
  branch?: {  // 지점
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  bank?: {  // 은행
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  memo?: {  // 메모
    rich_text: Array<{
      plain_text: string;
    }>;
  };
  relatedmember?: {  // 관련 회원
    relation: Array<{
      id: string;
    }>;
  };
  donation?: {  // 기부 관계
    relation: Array<{
      id: string;
    }>;
  };
  memberfee?: {  // 회비 관계
    relation: Array<{
      id: string;
    }>;
  };
  servicefee?: {  // 봉사금 관계
    relation: Array<{
      id: string;
    }>;
  };
  specialfee?: {  // 특별회비 관계
    relation: Array<{
      id: string;
    }>;
  };

}

/**
 * 거래내역 데이터 모델 (실제 저장/처리 구조)
 */
export interface Transaction {
  id?: string;
  date: string;
  description: string;
  in: number;
  out: number;
  balance: number;
  branch?: string;
  bank?: string;
  memo?: string;
  // 이전 필드 호환성 유지를 위해 선택적 필드로 남겨둠
  type?: string;       // '입금' 또는 '출금' (레거시)
  amount?: number;     // 거래금액 (레거시)
}

/**
 * 거래내역 API 응답 인터페이스
 */
export interface TransactionResponse {
  transactions: Transaction[];
  count?: number;
}

/**
 * API 응답을 위한 회원 모델
 */
export interface Member {
  id: string;
  name: string;
  nickname?: string;
  phone?: number;
  joinDate?: string;
  memberFee?: number;
  paidFee?: number;
  unpaidFee?: number;
  deduction?: string[];
}

/**
 * API 응답을 위한 회비 모델
 */
export interface Fee {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  amount: number;
  method: string;
}

/**
 * API 응답을 위한 기부금 모델
 */
export interface Donation {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  amount: number;
  method: string;
  category: string[];
  fromFriend?: string;
}

/**
 * API 응답을 위한 특별행사 모델
 */
export interface SpecialEvent {
  id: string;
  memberId: string;
  memberName: string;
  nickname?: string;
  date: string;
  eventType: string;
}

/**
 * API 응답을 위한 특별회비 모델
 */
export interface SpecialFee {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  amount: number;
  method: string;
} 