import dayjs from 'dayjs';
import type { QueueItem, PriorityLevel } from '@/types';
import { generateUniqueId } from '@/utils/time';

const priorityLabels: Record<PriorityLevel, string> = {
  normal: '普通',
  vip: 'VIP',
  emergency: '应急'
};

export const initialQueue: QueueItem[] = [
  {
    id: generateUniqueId('q_'),
    queueNumber: 101,
    userId: 'user_101',
    userName: '杨阳',
    priority: 'vip',
    priorityLabel: priorityLabels.vip,
    status: 'playing',
    estimatedWaitTime: 0,
    peopleCount: 2,
    joinedAt: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    calledAt: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 102,
    userId: 'user_102',
    userName: '黄磊',
    priority: 'normal',
    priorityLabel: priorityLabels.normal,
    status: 'called',
    estimatedWaitTime: 0,
    peopleCount: 4,
    joinedAt: dayjs().subtract(25, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    calledAt: dayjs().subtract(2, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 103,
    userId: 'user_103',
    userName: '周杰',
    priority: 'normal',
    priorityLabel: priorityLabels.normal,
    status: 'waiting',
    estimatedWaitTime: 15,
    peopleCount: 2,
    joinedAt: dayjs().subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 104,
    userId: 'user_104',
    userName: '吴婷',
    priority: 'emergency',
    priorityLabel: priorityLabels.emergency,
    status: 'waiting',
    estimatedWaitTime: 5,
    peopleCount: 2,
    joinedAt: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 105,
    userId: 'user_105',
    userName: '郑凯',
    priority: 'normal',
    priorityLabel: priorityLabels.normal,
    status: 'waiting',
    estimatedWaitTime: 30,
    peopleCount: 3,
    joinedAt: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 106,
    userId: 'user_106',
    userName: '孙丽',
    priority: 'vip',
    priorityLabel: priorityLabels.vip,
    status: 'waiting',
    estimatedWaitTime: 10,
    peopleCount: 2,
    joinedAt: dayjs().subtract(8, 'minute').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: generateUniqueId('q_'),
    queueNumber: 107,
    userId: 'user_107',
    userName: '马超',
    priority: 'normal',
    priorityLabel: priorityLabels.normal,
    status: 'waiting',
    estimatedWaitTime: 45,
    peopleCount: 4,
    joinedAt: dayjs().subtract(5, 'minute').format('YYYY-MM-DD HH:mm:ss')
  }
];

export const getPriorityColor = (priority: PriorityLevel): string => {
  const colors: Record<PriorityLevel, string> = {
    vip: '#ef4444',
    emergency: '#8b5cf6',
    normal: '#22c55e'
  };
  return colors[priority];
};

export const sortQueueByPriority = (queue: QueueItem[]): QueueItem[] => {
  const priorityOrder: Record<PriorityLevel, number> = {
    emergency: 0,
    vip: 1,
    normal: 2
  };

  return [...queue].sort((a, b) => {
    if (a.status === 'playing' && b.status !== 'playing') return -1;
    if (b.status === 'playing' && a.status !== 'playing') return 1;
    if (a.status === 'called' && b.status === 'waiting') return -1;
    if (b.status === 'called' && a.status === 'waiting') return 1;

    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
};
