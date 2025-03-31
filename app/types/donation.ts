export interface Donation {
  id: string;
  date: string;
  paid_fee: number;
  class: string[];
  method: string[];
}

export interface DonationResponse {
  donations: Donation[];
} 