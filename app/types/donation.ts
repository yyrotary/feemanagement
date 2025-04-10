export interface Donation {
  id: string;
  date: string;
  paid_fee: number;
  class: string[];
  method: string[];
  memberName?: string;
  from_friend?: {
    id: string;
    name: string;
  };
}

export interface DonationResponse {
  donations: Donation[];
} 