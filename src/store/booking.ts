import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Booking, BookingStatus } from '@/types';
import { initialBookings } from '@/data/bookings';
import { validateBooking } from '@/utils/conflict';
import { generateUniqueId } from '@/utils/time';

interface BookingStore {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => { success: boolean; message?: string; booking?: Booking };
  cancelBooking: (bookingId: string) => { success: boolean; message?: string };
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  getBookingsByCourt: (courtId: string) => Booking[];
  getBookingsByDate: (date: string) => Booking[];
  getCourtBookingsByDate: (courtId: string, date: string) => Booking[];
  getMyBookings: () => Booking[];
  checkConflict: (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => { hasConflict: boolean; message?: string };
  checkCoachAvailability: (
    coachId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => { available: boolean; message?: string };
  extendBooking: (
    bookingId: string,
    extendHours: number,
    extendCoach: boolean
  ) => {
    success: boolean;
    message?: string;
    courtExtendPrice?: number;
    coachExtendPrice?: number;
    totalExtendPrice?: number;
  };
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: initialBookings,

  addBooking: (bookingData) => {
    const state = get();
    const validation = validateBooking(
      bookingData.courtId,
      bookingData.date,
      bookingData.startTime,
      bookingData.endTime,
      state.bookings
    );

    if (validation.hasConflict) {
      console.log('[Booking] 预约冲突:', validation.message);
      return { success: false, message: validation.message };
    }

    const newBooking: Booking = {
      ...bookingData,
      id: generateUniqueId('bk_'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'confirmed'
    };

    set((state) => ({
      bookings: [...state.bookings, newBooking]
    }));

    console.log('[Booking] 预约成功:', newBooking.id);
    return { success: true, booking: newBooking };
  },

  cancelBooking: (bookingId) => {
    const state = get();
    const booking = state.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, message: '预约不存在' };
    }

    if (booking.status !== 'confirmed') {
      return { success: false, message: '该预约状态不允许取消' };
    }

    const bookingTime = dayjs(`${booking.date} ${booking.startTime}`);
    const diffHours = bookingTime.diff(dayjs(), 'hour');

    if (diffHours < 2) {
      return { success: false, message: '预约开始前2小时内不可取消' };
    }

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      )
    }));

    console.log('[Booking] 取消预约成功，时段已释放:', bookingId);
    return { success: true, message: '取消成功，时段已释放' };
  },

  updateBookingStatus: (bookingId, status) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status } : b
      )
    }));
  },

  getBookingsByCourt: (courtId) => {
    return get().bookings.filter((b) => b.courtId === courtId);
  },

  getBookingsByDate: (date) => {
    return get().bookings.filter((b) => b.date === date);
  },

  getCourtBookingsByDate: (courtId, date) => {
    return get().bookings.filter(
      (b) => b.courtId === courtId && b.date === date && b.status !== 'cancelled'
    );
  },

  getMyBookings: () => {
    return get().bookings.filter((b) => b.userId === 'user_current');
  },

  checkConflict: (courtId, date, startTime, endTime, excludeBookingId) => {
    const validation = validateBooking(
      courtId,
      date,
      startTime,
      endTime,
      get().bookings,
      excludeBookingId
    );
    return { hasConflict: validation.hasConflict, message: validation.message };
  },

  checkCoachAvailability: (coachId, date, startTime, endTime, excludeBookingId) => {
    const allBookings = get().bookings.filter(
      (b) =>
        b.coachId === coachId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        b.id !== excludeBookingId
    );

    for (const booking of allBookings) {
      const bookingStart = dayjs(`2000-01-01 ${booking.startTime}`);
      const bookingEnd = dayjs(`2000-01-01 ${booking.endTime}`);
      const newStart = dayjs(`2000-01-01 ${startTime}`);
      const newEnd = dayjs(`2000-01-01 ${endTime}`);

      if (newStart.isBefore(bookingEnd) && newEnd.isAfter(bookingStart)) {
        return {
          available: false,
          message: `教练在 ${booking.startTime}-${booking.endTime} 已有安排`
        };
      }
    }

    return { available: true };
  },

  extendBooking: (bookingId, extendHours, extendCoach) => {
    const state = get();
    const booking = state.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, message: '预约不存在' };
    }

    if (booking.status !== 'confirmed') {
      return { success: false, message: '只能对已确认的预约加钟' };
    }

    const currentEnd = dayjs(`${booking.date} ${booking.endTime}`);
    const newEndTime = currentEnd.add(extendHours, 'hour').format('HH:00');
    const newStartTime = booking.endTime;

    if (parseInt(newEndTime.split(':')[0], 10) > 22) {
      return { success: false, message: '加钟后超过22:00，不能超过当天营业时间' };
    }

    const courtConflict = state.checkConflict(
      booking.courtId,
      booking.date,
      newStartTime,
      newEndTime,
      booking.id
    );

    if (courtConflict.hasConflict) {
      return { success: false, message: `场地冲突：${courtConflict.message}` };
    }

    const courtExtendPrice = (booking.pricePerHour || 80) * extendHours;
    let coachExtendPrice = 0;

    if (extendCoach && booking.hasCoach && booking.coachId && booking.coachPricePerHour) {
      const coachAvailable = state.checkCoachAvailability(
        booking.coachId,
        booking.date,
        newStartTime,
        newEndTime,
        booking.id
      );

      if (!coachAvailable.available) {
        return { success: false, message: `教练冲突：${coachAvailable.message}` };
      }

      coachExtendPrice = booking.coachPricePerHour * extendHours;
    }

    const totalExtendPrice = courtExtendPrice + coachExtendPrice;

    const originalDuration = booking.originalDuration ||
      dayjs(`2000-01-01 ${booking.endTime}`).diff(
        dayjs(`2000-01-01 ${booking.startTime}`),
        'hour'
      );
    const extendedDuration = (booking.extendedDuration || 0) + extendHours;
    const totalDuration = originalDuration + extendedDuration;

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              endTime: newEndTime,
              price: b.price + totalExtendPrice,
              originalDuration,
              extendedDuration,
              totalDuration,
              originalPrice: b.originalPrice || b.price - totalExtendPrice,
              extendPrice: (b.extendPrice || 0) + totalExtendPrice,
              originalEndTime: b.originalEndTime || booking.endTime,
              isExtended: true
            }
          : b
      )
    }));

    console.log(
      '[Booking] 加钟成功:',
      bookingId,
      `+${extendHours}h`,
      '场地费:',
      courtExtendPrice,
      '教练费:',
      coachExtendPrice,
      '总计:',
      totalExtendPrice
    );

    return {
      success: true,
      courtExtendPrice,
      coachExtendPrice,
      totalExtendPrice
    };
  }
}));
