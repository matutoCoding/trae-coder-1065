export type CourtType = 'hard' | 'clay' | 'grass' | 'indoor';

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  typeLabel: string;
  pricePerHour: number;
  capacity: number;
  description: string;
  status: 'available' | 'maintenance' | 'closed';
  imageUrl: string;
  tags: string[];
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  courtId: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  userId: string;
  userName: string;
  userPhone: string;
  price: number;
  status: BookingStatus;
  createdAt: string;
  hasCoach: boolean;
  coachId?: string;
  coachName?: string;
}

export type PriorityLevel = 'normal' | 'vip' | 'emergency';

export interface QueueItem {
  id: string;
  queueNumber: number;
  userId: string;
  userName: string;
  courtId?: string;
  priority: PriorityLevel;
  priorityLabel: string;
  status: 'waiting' | 'called' | 'playing' | 'completed' | 'left';
  estimatedWaitTime: number;
  peopleCount: number;
  joinedAt: string;
  calledAt?: string;
}

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  level: string;
  experience: number;
  pricePerHour: number;
  rating: number;
  specialties: string[];
  available: boolean;
  description: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  isVip: boolean;
  vipExpireDate?: string;
  vipLevel?: number;
  totalBookings: number;
  totalSpent: number;
}
