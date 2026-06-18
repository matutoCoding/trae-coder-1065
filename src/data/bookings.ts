import dayjs from 'dayjs';
import type { Booking } from '@/types';
import { generateUniqueId } from '@/utils/time';

const today = dayjs().format('YYYY-MM-DD');
const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

export const initialBookings: Booking[] = [
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_001',
    courtName: '1号球场',
    date: today,
    startTime: '08:00',
    endTime: '10:00',
    userId: 'user_001',
    userName: '张伟',
    userPhone: '138****1234',
    price: 160,
    status: 'confirmed',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: true,
    coachId: 'coach_001',
    coachName: '李教练'
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_001',
    courtName: '1号球场',
    date: today,
    startTime: '14:00',
    endTime: '16:00',
    userId: 'user_002',
    userName: '王芳',
    userPhone: '139****5678',
    price: 160,
    status: 'confirmed',
    createdAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: false
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_003',
    courtName: '3号球场',
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    userId: 'user_003',
    userName: '刘强',
    userPhone: '137****9012',
    price: 240,
    status: 'confirmed',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: true,
    coachId: 'coach_002',
    coachName: '陈教练'
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_005',
    courtName: '5号球场',
    date: today,
    startTime: '18:00',
    endTime: '20:00',
    userId: 'user_004',
    userName: '赵敏',
    userPhone: '136****3456',
    price: 360,
    status: 'confirmed',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: false
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_002',
    courtName: '2号球场',
    date: today,
    startTime: '16:00',
    endTime: '18:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    price: 160,
    status: 'confirmed',
    createdAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: true,
    coachId: 'coach_001',
    coachName: '李教练'
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_004',
    courtName: '4号球场',
    date: tomorrow,
    startTime: '10:00',
    endTime: '12:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    price: 300,
    status: 'confirmed',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: false
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_007',
    courtName: '7号球场（儿童）',
    date: yesterdayDate(),
    startTime: '15:00',
    endTime: '17:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    price: 100,
    status: 'completed',
    createdAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: true,
    coachId: 'coach_003',
    coachName: '孙教练'
  },
  {
    id: generateUniqueId('bk_'),
    courtId: 'court_001',
    courtName: '1号球场',
    date: yesterdayDate(),
    startTime: '09:00',
    endTime: '11:00',
    userId: 'user_current',
    userName: '我',
    userPhone: '138****0001',
    price: 160,
    status: 'cancelled',
    createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    hasCoach: false
  }
];

function yesterdayDate(): string {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
}

export const getMyBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter((b) => b.userId === 'user_current');
};

export const getActiveBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter((b) => b.status === 'confirmed');
};
