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
  }
}));
