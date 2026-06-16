export interface User {
  id: string;
  display_name: string;
  current_level: number;
  total_leaves: number;
  postal_code: string;
  created_at: string;
}

export interface CarbonEvent {
  id: string;
  user_id: string;
  category: 'transport' | 'housing' | 'food';
  source_provider: 'arcadia' | 'radar_sdk' | 'manual';
  raw_value: number;
  raw_unit: string;
  computed_co2e_kg: number;
  region_code?: string;
  timestamp: string;
}

export interface ArchetypeOptions {
  housing: 'apartment' | 'townhouse' | 'family';
  diet: 'vegan' | 'balanced' | 'meat';
  commute: 'transit' | 'hybrid' | 'gas';
}

export interface Challenge {
  id: string;
  userId: string;
  type: 'cold-wash' | 'vampire-hunt';
  title: string;
  description: string;
  rewardLeaves: number;
  targetDays: number;
  currentStreak: number;
  completed: boolean;
  progressLogs: boolean[]; // Array of 7 booleans indicating completion status of each day
  rewardApplied: boolean;
  updatedAt: string;
}

export interface Voucher {
  id: string;
  userId: string;
  sponsorName: string;
  title: string;
  description: string;
  rewardType: 'tree' | 'discount' | 'plug';
  couponCode?: string;
  costLeaves: number;
  redeemedAt?: string;
}

export interface IngestCarbonEventPayload {
  userId: string;
  category: 'transport' | 'housing' | 'food';
  source_provider: 'arcadia' | 'radar_sdk' | 'manual';
  raw_value: number;
  raw_unit: string;
  region_code?: string;
  timestamp?: string;
}
