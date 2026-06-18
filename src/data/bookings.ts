import dayjs from 'dayjs';
import type { Booking } from '@/types';
import { generateUniqueId } from '@/utils/time';
import { courts } from '@/data/courts';
import { coaches } from '@/data/coaches';

const today = dayjs().format('YYYY-MM-DD');
const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

function yesterdayDate(): string {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
}

function getCourtPrice(courtId: string): number {
  const court = courts.find((c) => c.id === courtId);
  return court?.pricePerHour || 80;
}

function getCoachPrice(coachId?: string): number | undefined {
  if (!coachId) return undefined;
  const coach = coaches.find((c) => c.id === coachId);
  return coach?.pricePerHour;
}

function createBooking(
  data: Partial<Booking> & Pick<Booking, 'courtId' | 'courtName' | 'date' | 'startTime' | 'endTime' | 'userId' | 'userName' | 'userPhone' | 'hasCoach'>
): Booking {
  const duration = dayjs(`2000-01-01 ${data.endTime}`).diff(
    dayjs(`2000-01-01 ${data.startTime}`),
    'hour'
  );
  const courtPricePerHour = getCourtPrice(data.courtId);
  const coachPricePerHour = data.hasCoach && data.coachId
    ? getCoachPrice(data.coachId)
    : undefined;
  const courtPrice = courtPricePerHour * duration;
  const coachPrice = coachPricePerHour ? coachPricePerHour * duration : 0;
  const totalPrice = courtPrice + coachPrice;

  return {
    id: generateUniqueId('bk_'),
    price: totalPrice,
    status: 'confirmed',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    ...data,
    pricePerHour: courtPricePerHour,
    coachPricePerHour,
    originalDuration: duration,
    extendedDuration: 0,
    totalDuration: duration,
    originalPrice: totalPrice,
    extendPrice: 0,
    originalEndTime: data.endTime,
    isExtended: false
  };
}

export const initialBookings: Booking[] = [
  createBooking({
    courtId: 'court_001',
    courtName: '1号球场',
    date: today,
    startTime: '08:00',
    endTime: '10:00',
    userId: 'user_001',
    userName: '张伟',
    userPhone: '138****1234',
    hasCoach: true,
    coachId: 'coach_001',
    coachName: '李教练',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  }),
  createBooking({
    courtId: 'court_001',
    courtName: '1号球场',
    date: today,
    startTime: '14:00',
    endTime: '16:00',
    userId: 'user_002',
    userName: '王芳',
    userPhone: '139****5678',
    hasCoach: false,
    createdAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')
  }),
  createBooking({
    courtId: 'court_003',
    courtName: '3号球场',
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    userId: 'user_003',
    userName: '刘强',
    userPhone: '137****9012',
    hasCoach: true,
    coachId: 'coach_002',
    coachName: '陈教练',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  }),
  createBooking({
    courtId: 'court_005',
    courtName: '5号球场',
    date: today,
    startTime: '18:00',
    endTime: '20:00',
    userId: 'user_004',
    userName: '赵敏',
    userPhone: '136****3456',
    hasCoach: false,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  }),
  createBooking({
    courtId: 'court_002',
    courtName: '2号球场',
    date: today,
    startTime: '16:00',
    endTime: '18:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    hasCoach: true,
    coachId: 'coach_001',
    coachName: '李教练',
    createdAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss')
  }),
  createBooking({
    courtId: 'court_004',
    courtName: '4号球场',
    date: tomorrow,
    startTime: '10:00',
    endTime: '12:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    hasCoach: false,
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  }),
  {
    ...createBooking({
      courtId: 'court_007',
      courtName: '7号球场（儿童）',
      date: yesterdayDate(),
      startTime: '15:00',
      endTime: '17:00',
      userId: 'user_current',
      userName: '我',
      userPhone: '138****0001',
      hasCoach: true,
      coachId: 'coach_003',
      coachName: '孙教练',
      createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss')
    }),
    status: 'completed'
  },
  {
    ...createBooking({
      courtId: 'court_001',
      courtName: '1号球场',
      date: yesterdayDate(),
      startTime: '09:00',
      endTime: '11:00',
      userId: 'user_current',
      userName: '我',
      userPhone: '138****0001',
      hasCoach: false,
      createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss')
    }),
    status: 'cancelled'
  }
];

export const getMyBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter((b) => b.userId === 'user_current');
};

export const getActiveBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter((b) => b.status === 'confirmed');
};
