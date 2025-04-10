/**
 * 회원(Member) 관련 인터페이스 정의
 */

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  deduction?: string[];
}

export interface MemberResponse {
  members: Member[];
}

export interface MemberWithFees extends Member {
  totalPaid: number;
  regulars: {
    count: number;
    amount: number;
  };
  specials: {
    count: number;
    amount: number;
  };
}

export interface MembersWithFeesResponse {
  members: MemberWithFees[];
} 