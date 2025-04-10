export interface Transaction {
  id: string;
  date: string;        // 거래일
  in?: number;         // 입금액
  out?: number;        // 출금액
  balance: number;     // 잔액
  description: string; // 기록사항
  branch: string;      // 거래점
  bank: string;        // 거래은행
  memo?: string;       // 이체메모
  // 이전 필드 호환성 유지를 위해 선택적 필드로 남겨둠
  type?: string;       // '입금' 또는 '출금' (레거시)
  amount?: number;     // 거래금액 (레거시)
}

export interface TransactionResponse {
  transactions: Transaction[];
} 