import type { Booking } from '@/types';
import { isTimeOverlap } from './time';

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBooking?: Booking;
  message?: string;
}

export const validateBooking = (
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
  excludeBookingId?: string
): ConflictResult => {
  if (!courtId) {
    return { hasConflict: true, message: '请选择场地' };
  }
  if (!date) {
    return { hasConflict: true, message: '请选择日期' };
  }
  if (!startTime || !endTime) {
    return { hasConflict: true, message: '请选择时段' };
  }

  const conflict = existingBookings.find((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) return false;
    if (booking.courtId !== courtId) return false;
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled') return false;

    return isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime);
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingBooking: conflict,
      message: `该时段已被预订（${conflict.userName}），请选择其他时段`
    };
  }

  return { hasConflict: false };
};

export const getBookedSlotsForCourt = (
  courtId: string,
  date: string,
  bookings: Booking[]
): { startTime: string; endTime: string }[] => {
  return bookings
    .filter(
      (b) => b.courtId === courtId && b.date === date && b.status !== 'cancelled'
    )
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));
};

export const isSlotBooked = (
  startTime: string,
  endTime: string,
  bookedSlots: { startTime: string; endTime: string }[]
): boolean => {
  return bookedSlots.some((slot) =>
    isTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)
  );
};
