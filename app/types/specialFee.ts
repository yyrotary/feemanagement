export interface SpecialEvent {
  id: string;
  name: string;
  nickname: string;
  date: string;
  events: string;
  isPersonal: boolean;
}

export interface SpecialFee {
  id: string;
  amount: number;
  date: string;
  eventName: string;
  method: string[];
}

export interface SpecialFeeCalculation {
  events: SpecialEvent[];
  totalFee: number;
  specialEventFee: number;
} 