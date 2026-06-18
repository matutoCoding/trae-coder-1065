import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Booking, BookingStatus, FeeRecord, FeeRecordType } from '@/types';
import { initialBookings } from '@/data/bookings';
import { validateBooking } from '@/utils/conflict';
import { generateUniqueId } from '@/utils/time';
import { courts } from '@/data/courts';
import { coaches } from '@/data/coaches';

interface BookingStore {
  bookings: Booking[];
  feeRecords: FeeRecord[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => { success: boolean; message?: string; booking?: Booking };
  cancelBooking: (bookingId: string) => { success: boolean; message?: string; refundAmount?: number };
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  addCoachToBooking: (bookingId: string, coachId: string, coachName: string) => { success: boolean; message?: string; coachFee?: number };
  getBookingsByCourt: (courtId: string) => Booking[];
  getBookingsByDate: (date: string) => Booking[];
  getCourtBookingsByDate: (courtId: string, date: string) => Booking[];
  getMyBookings: () => Booking[];
  getFeeRecordsByBooking: (bookingId: string) => FeeRecord[];
  getMyFeeRecords: () => FeeRecord[];
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
  getCoachBookingsByDate: (coachId: string, date: string) => Booking[];
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

const FEE_TYPE_LABELS: Record<FeeRecordType, string> = {
  booking: '场地预约',
  add_coach: '添加教练',
  extend: '延长加钟',
  refund: '退款',
  cancel: '取消费用'
};

const getCourtPricePerHour = (courtId: string): number => {
  const court = courts.find((c) => c.id === courtId);
  return court?.pricePerHour || 80;
};

const getCoachPricePerHour = (coachId: string): number => {
  const coach = coaches.find((c) => c.id === coachId);
  return coach?.pricePerHour || 100;
};

const createFeeRecord = (
  bookingId: string,
  type: FeeRecordType,
  amount: number,
  description: string,
  detail?: FeeRecord['detail']
): FeeRecord => ({
  id: generateUniqueId('fee_'),
  bookingId,
  type,
  typeLabel: FEE_TYPE_LABELS[type],
  amount,
  description,
  createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  detail
});

const calcDuration = (startTime: string, endTime: string): number => {
  return dayjs(`2000-01-01 ${endTime}`).diff(dayjs(`2000-01-01 ${startTime}`), 'hour');
};

const generateInitialFeeRecords = (bookings: Booking[]): FeeRecord[] => {
  const records: FeeRecord[] = [];

  bookings.forEach((booking) => {
    const duration = calcDuration(booking.startTime, booking.endTime);
    const courtPrice = (booking.pricePerHour || 80) * duration;
    const coachPrice = booking.hasCoach && booking.coachPricePerHour
      ? booking.coachPricePerHour * duration
      : 0;

    const bookingRecord: FeeRecord = {
      id: generateUniqueId('fee_'),
      bookingId: booking.id,
      type: 'booking',
      typeLabel: '场地预订',
      amount: booking.price,
      description: booking.hasCoach
        ? `${booking.courtName} ${booking.startTime}-${booking.endTime} ${duration}小时（含教练）`
        : `${booking.courtName} ${booking.startTime}-${booking.endTime} ${duration}小时`,
      createdAt: booking.createdAt,
      detail: {
        courtPrice,
        coachPrice: coachPrice > 0 ? coachPrice : undefined,
        hours: duration
      }
    };
    records.push(bookingRecord);

    if (booking.status === 'cancelled') {
      const refundRecord: FeeRecord = {
        id: generateUniqueId('fee_'),
        bookingId: booking.id,
        type: 'refund',
        typeLabel: '退款',
        amount: -booking.price,
        description: `${booking.courtName} 取消预约，全额退款`,
        createdAt: dayjs(booking.createdAt).add(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        detail: {
          courtPrice: -booking.price
        }
      };
      records.push(refundRecord);
    }

    if (booking.isExtended && booking.extendPrice) {
      const extendRecord: FeeRecord = {
        id: generateUniqueId('fee_'),
        bookingId: booking.id,
        type: 'extend',
        typeLabel: '加钟',
        amount: booking.extendPrice,
        description: `延长${booking.extendedDuration}小时至${booking.endTime}`,
        createdAt: dayjs(booking.createdAt).add(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        detail: {
          courtPrice: booking.extendPrice,
          hours: booking.extendedDuration,
          originalEndTime: booking.originalEndTime,
          newEndTime: booking.endTime
        }
      };
      records.push(extendRecord);
    }
  });

  return records;
};

const initialFeeRecords = generateInitialFeeRecords(initialBookings);

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: initialBookings,
  feeRecords: initialFeeRecords,

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

    if (bookingData.hasCoach && bookingData.coachId) {
      const coachAvailable = state.checkCoachAvailability(
        bookingData.coachId,
        bookingData.date,
        bookingData.startTime,
        bookingData.endTime
      );
      if (!coachAvailable.available) {
        console.log('[Booking] 教练冲突:', coachAvailable.message);
        return { success: false, message: `教练冲突：${coachAvailable.message}` };
      }
    }

    const duration = calcDuration(bookingData.startTime, bookingData.endTime);
    const courtPricePerHour = bookingData.pricePerHour || getCourtPricePerHour(bookingData.courtId);
    const coachPricePerHour = bookingData.hasCoach && bookingData.coachId
      ? bookingData.coachPricePerHour || getCoachPricePerHour(bookingData.coachId)
      : undefined;
    const courtPrice = courtPricePerHour * duration;
    const coachPrice = coachPricePerHour ? coachPricePerHour * duration : 0;
    const totalPrice = courtPrice + coachPrice;

    const newBooking: Booking = {
      ...bookingData,
      id: generateUniqueId('bk_'),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'confirmed',
      price: totalPrice,
      pricePerHour: courtPricePerHour,
      coachPricePerHour,
      originalDuration: duration,
      extendedDuration: 0,
      totalDuration: duration,
      originalPrice: totalPrice,
      extendPrice: 0,
      originalEndTime: bookingData.endTime,
      isExtended: false
    };

    const feeRecord = createFeeRecord(
      newBooking.id,
      'booking',
      totalPrice,
      `${bookingData.courtName} ${bookingData.startTime}-${bookingData.endTime} ${duration}小时`,
      {
        courtPrice,
        coachPrice: coachPrice > 0 ? coachPrice : undefined,
        hours: duration
      }
    );

    set((state) => ({
      bookings: [...state.bookings, newBooking],
      feeRecords: [...state.feeRecords, feeRecord]
    }));

    console.log('[Booking] 预约成功:', newBooking.id, '费用:', totalPrice);
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

    const refundAmount = booking.price;

    const feeRecord = createFeeRecord(
      bookingId,
      'refund',
      -refundAmount,
      `${booking.courtName} 取消预约，全额退款`,
      {
        courtPrice: -booking.price
      }
    );

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      ),
      feeRecords: [...state.feeRecords, feeRecord]
    }));

    console.log('[Booking] 取消预约成功，退款:', refundAmount, bookingId);
    return { success: true, message: '取消成功，时段已释放', refundAmount };
  },

  updateBookingStatus: (bookingId, status) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId ? { ...b, status } : b
      )
    }));
  },

  addCoachToBooking: (bookingId, coachId, coachName) => {
    const state = get();
    const booking = state.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, message: '预约不存在' };
    }

    if (booking.hasCoach) {
      return { success: false, message: '该预约已有教练' };
    }

    if (booking.status !== 'confirmed') {
      return { success: false, message: '只能为已确认的预约添加教练' };
    }

    const coachAvailable = state.checkCoachAvailability(
      coachId,
      booking.date,
      booking.startTime,
      booking.endTime,
      bookingId
    );

    if (!coachAvailable.available) {
      return { success: false, message: `教练不可用：${coachAvailable.message}` };
    }

    const duration = calcDuration(booking.startTime, booking.endTime);
    const coachPricePerHour = getCoachPricePerHour(coachId);
    const coachFee = coachPricePerHour * duration;

    const feeRecord = createFeeRecord(
      bookingId,
      'add_coach',
      coachFee,
      `${coachName} 陪练 ${duration}小时`,
      {
        coachPrice: coachFee,
        hours: duration
      }
    );

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              hasCoach: true,
              coachId,
              coachName,
              coachPricePerHour,
              price: b.price + coachFee,
              originalPrice: (b.originalPrice || b.price) + coachFee
            }
          : b
      ),
      feeRecords: [...state.feeRecords, feeRecord]
    }));

    console.log('[Booking] 添加教练成功:', coachName, '费用:', coachFee);
    return { success: true, coachFee };
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

  getFeeRecordsByBooking: (bookingId) => {
    return get().feeRecords
      .filter((r) => r.bookingId === bookingId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getMyFeeRecords: () => {
    const myBookingIds = new Set(get().getMyBookings().map((b) => b.id));
    return get().feeRecords
      .filter((r) => myBookingIds.has(r.bookingId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  getCoachBookingsByDate: (coachId, date) => {
    return get().bookings.filter(
      (b) => b.coachId === coachId && b.date === date && b.status !== 'cancelled'
    );
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
    const originalEndTime = booking.endTime;
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

    const courtPricePerHour = booking.pricePerHour || getCourtPricePerHour(booking.courtId);
    const courtExtendPrice = courtPricePerHour * extendHours;
    let coachExtendPrice = 0;

    if (extendCoach && booking.hasCoach && booking.coachId) {
      const coachPricePerHour = booking.coachPricePerHour || getCoachPricePerHour(booking.coachId);
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

      coachExtendPrice = coachPricePerHour * extendHours;
    }

    const totalExtendPrice = courtExtendPrice + coachExtendPrice;

    const originalDuration = booking.originalDuration ||
      calcDuration(booking.startTime, booking.endTime);
    const extendedDuration = (booking.extendedDuration || 0) + extendHours;
    const totalDuration = originalDuration + extendedDuration;

    const feeRecord = createFeeRecord(
      bookingId,
      'extend',
      totalExtendPrice,
      `延长${extendHours}小时至${newEndTime}`,
      {
        courtPrice: courtExtendPrice,
        coachPrice: extendCoach ? coachExtendPrice : undefined,
        hours: extendHours,
        originalEndTime,
        newEndTime
      }
    );

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
              originalPrice: b.originalPrice || b.price,
              extendPrice: (b.extendPrice || 0) + totalExtendPrice,
              originalEndTime: b.originalEndTime || originalEndTime,
              isExtended: true,
              pricePerHour: courtPricePerHour
            }
          : b
      ),
      feeRecords: [...state.feeRecords, feeRecord]
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
