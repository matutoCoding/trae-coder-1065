import dayjs from 'dayjs';
import type { Booking, TimeSlot } from '@/types';

export const isTimeOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const startATime = dayjs(`2000-01-01 ${startA}`);
  const endATime = dayjs(`2000-01-01 ${endA}`);
  const startBTime = dayjs(`2000-01-01 ${startB}`);
  const endBTime = dayjs(`2000-01-01 ${endB}`);

  return startATime.isBefore(endBTime) && startBTime.isBefore(endATime);
};

export const checkBookingConflict = (
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
  excludeBookingId?: string
): Booking | null => {
  const conflictBooking = existingBookings.find((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) return false;
    if (booking.courtId !== courtId) return false;
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled') return false;

    return isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime);
  });

  return conflictBooking || null;
};

export const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let hour = 6;

  while (hour < 22) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = hour + 1;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    const label = `${startTime} - ${endTime}`;

    slots.push({
      id: `slot_${hour}`,
      startTime,
      endTime,
      label
    });

    hour++;
  }

  return slots;
};

export const getCurrentTimeSlotIndex = (slots: TimeSlot[]): number => {
  const now = dayjs();
  const currentMinutes = now.hour() * 60 + now.minute();

  for (let i = 0; i < slots.length; i++) {
    const [sh, sm] = slots[i].startTime.split(':').map(Number);
    const [eh, em] = slots[i].endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return i;
    }
    if (currentMinutes < startMinutes) {
      return i;
    }
  }

  return slots.length;
};

export const getNextNDates = (n: number): { date: string; label: string; weekday: string }[] => {
  const dates = [];
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  for (let i = 0; i < n; i++) {
    const date = dayjs().add(i, 'day');
    dates.push({
      date: date.format('YYYY-MM-DD'),
      label: i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : date.format('MM/DD'),
      weekday: weekdays[date.day()]
    });
  }

  return dates;
};

export const generateUniqueId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};
