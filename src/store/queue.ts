import { create } from 'zustand';
import dayjs from 'dayjs';
import type { QueueItem, PriorityLevel } from '@/types';
import { courts } from '@/data/courts';
import { generateUniqueId } from '@/utils/time';

interface CourtQueue {
  queueNumber: number;
  items: QueueItem[];
}

interface QueueStore {
  courtQueues: Record<string, CourtQueue>;
  joinQueue: (
    courtId: string,
    userName: string,
    peopleCount: number,
    priority: PriorityLevel,
    userId?: string
  ) => QueueItem;
  leaveQueue: (courtId: string, queueId: string) => void;
  callNext: (courtId: string) => QueueItem | null;
  callSpecific: (courtId: string, queueId: string) => void;
  markPlaying: (courtId: string, queueId: string) => void;
  markCompleted: (courtId: string, queueId: string) => void;
  insertVip: (
    courtId: string,
    userName: string,
    peopleCount: number,
    userId?: string
  ) => QueueItem;
  insertEmergency: (
    courtId: string,
    userName: string,
    peopleCount: number
  ) => QueueItem;
  getCourtQueue: (courtId: string) => QueueItem[];
  getSortedCourtQueue: (courtId: string) => QueueItem[];
  getCourtWaitingCount: (courtId: string) => number;
  getCourtCurrentCalled: (courtId: string) => QueueItem | null;
  getCourtCurrentPlaying: (courtId: string) => QueueItem | null;
  getAllWaitingCount: () => number;
}

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  normal: '普通',
  vip: 'VIP',
  emergency: '应急'
};

const sortQueueByPriority = (queue: QueueItem[]): QueueItem[] => {
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

const initCourtQueues = (): Record<string, CourtQueue> => {
  const result: Record<string, CourtQueue> = {};
  const availableCourts = courts.filter((c) => c.status === 'available');

  availableCourts.forEach((court, idx) => {
    const prefix = (idx + 1) * 100;
    result[court.id] = {
      queueNumber: prefix + 1,
      items: []
    };

    if (idx === 0) {
      result[court.id].items.push(
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 1,
          userId: 'user_101',
          userName: '杨阳',
          courtId: court.id,
          courtName: court.name,
          priority: 'vip',
          priorityLabel: 'VIP',
          status: 'playing',
          estimatedWaitTime: 0,
          peopleCount: 2,
          joinedAt: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          calledAt: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss')
        },
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 2,
          userId: 'user_102',
          userName: '黄磊',
          courtId: court.id,
          courtName: court.name,
          priority: 'normal',
          priorityLabel: '普通',
          status: 'called',
          estimatedWaitTime: 0,
          peopleCount: 4,
          joinedAt: dayjs().subtract(25, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          calledAt: dayjs().subtract(2, 'minute').format('YYYY-MM-DD HH:mm:ss')
        },
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 3,
          userId: 'user_103',
          userName: '周杰',
          courtId: court.id,
          courtName: court.name,
          priority: 'normal',
          priorityLabel: '普通',
          status: 'waiting',
          estimatedWaitTime: 15,
          peopleCount: 2,
          joinedAt: dayjs().subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss')
        },
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 4,
          userId: 'user_104',
          userName: '吴婷',
          courtId: court.id,
          courtName: court.name,
          priority: 'emergency',
          priorityLabel: '应急',
          status: 'waiting',
          estimatedWaitTime: 5,
          peopleCount: 2,
          joinedAt: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss')
        }
      );
      result[court.id].queueNumber = prefix + 5;
    } else if (idx === 1) {
      result[court.id].items.push(
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 1,
          userId: 'user_201',
          userName: '郑凯',
          courtId: court.id,
          courtName: court.name,
          priority: 'normal',
          priorityLabel: '普通',
          status: 'playing',
          estimatedWaitTime: 0,
          peopleCount: 3,
          joinedAt: dayjs().subtract(40, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          calledAt: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss')
        },
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 2,
          userId: 'user_202',
          userName: '孙丽',
          courtId: court.id,
          courtName: court.name,
          priority: 'vip',
          priorityLabel: 'VIP',
          status: 'waiting',
          estimatedWaitTime: 10,
          peopleCount: 2,
          joinedAt: dayjs().subtract(8, 'minute').format('YYYY-MM-DD HH:mm:ss')
        }
      );
      result[court.id].queueNumber = prefix + 3;
    } else if (idx === 2) {
      result[court.id].items.push(
        {
          id: generateUniqueId('q_'),
          queueNumber: prefix + 1,
          userId: 'user_301',
          userName: '马超',
          courtId: court.id,
          courtName: court.name,
          priority: 'normal',
          priorityLabel: '普通',
          status: 'waiting',
          estimatedWaitTime: 20,
          peopleCount: 4,
          joinedAt: dayjs().subtract(5, 'minute').format('YYYY-MM-DD HH:mm:ss')
        }
      );
      result[court.id].queueNumber = prefix + 2;
    }
  });

  return result;
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  courtQueues: initCourtQueues(),

  joinQueue: (courtId, userName, peopleCount, priority = 'normal', userId) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court) throw new Error('场地不存在');

    const state = get();
    const currentQueue = state.courtQueues[courtId] || { queueNumber: 1, items: [] };
    const newItem: QueueItem = {
      id: generateUniqueId('q_'),
      queueNumber: currentQueue.queueNumber,
      userId: userId || `user_${Date.now()}`,
      userName,
      courtId,
      courtName: court.name,
      priority,
      priorityLabel: PRIORITY_LABELS[priority],
      status: 'waiting',
      estimatedWaitTime: 0,
      peopleCount,
      joinedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };

    set((state) => ({
      courtQueues: {
        ...state.courtQueues,
        [courtId]: {
          queueNumber: currentQueue.queueNumber + 1,
          items: [...currentQueue.items, newItem]
        }
      }
    }));

    console.log(
      '[Queue] 加入排队:',
      court.name,
      'NO.',
      newItem.queueNumber,
      newItem.userName,
      priority
    );
    return get().courtQueues[courtId].items.find((q) => q.id === newItem.id) || newItem;
  },

  leaveQueue: (courtId, queueId) => {
    set((state) => {
      const currentQueue = state.courtQueues[courtId];
      if (!currentQueue) return state;
      return {
        courtQueues: {
          ...state.courtQueues,
          [courtId]: {
            ...currentQueue,
            items: currentQueue.items.filter((q) => q.id !== queueId)
          }
        }
      };
    });
    console.log('[Queue] 离队:', courtId, queueId);
  },

  callNext: (courtId) => {
    const sorted = get().getSortedCourtQueue(courtId);
    const nextItem = sorted.find((q) => q.status === 'waiting');

    if (!nextItem) {
      console.log('[Queue] 该场地没有等待中的人员:', courtId);
      return null;
    }

    set((state) => {
      const currentQueue = state.courtQueues[courtId];
      if (!currentQueue) return state;
      return {
        courtQueues: {
          ...state.courtQueues,
          [courtId]: {
            ...currentQueue,
            items: currentQueue.items.map((q) =>
              q.id === nextItem.id
                ? { ...q, status: 'called', calledAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
                : q
            )
          }
        }
      };
    });

    const court = courts.find((c) => c.id === courtId);
    console.log(
      '[Queue] 叫号:',
      court?.name,
      'NO.',
      nextItem.queueNumber,
      nextItem.userName
    );
    return get().courtQueues[courtId].items.find((q) => q.id === nextItem.id) || null;
  },

  callSpecific: (courtId, queueId) => {
    set((state) => {
      const currentQueue = state.courtQueues[courtId];
      if (!currentQueue) return state;
      return {
        courtQueues: {
          ...state.courtQueues,
          [courtId]: {
            ...currentQueue,
            items: currentQueue.items.map((q) =>
              q.id === queueId && q.status === 'waiting'
                ? { ...q, status: 'called', calledAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
                : q
            )
          }
        }
      };
    });
    console.log('[Queue] 指定叫号:', courtId, queueId);
  },

  markPlaying: (courtId, queueId) => {
    set((state) => {
      const currentQueue = state.courtQueues[courtId];
      if (!currentQueue) return state;
      return {
        courtQueues: {
          ...state.courtQueues,
          [courtId]: {
            ...currentQueue,
            items: currentQueue.items.map((q) =>
              q.id === queueId ? { ...q, status: 'playing' } : q
            )
          }
        }
      };
    });
    console.log('[Queue] 已上场:', courtId, queueId);
  },

  markCompleted: (courtId, queueId) => {
    set((state) => {
      const currentQueue = state.courtQueues[courtId];
      if (!currentQueue) return state;
      return {
        courtQueues: {
          ...state.courtQueues,
          [courtId]: {
            ...currentQueue,
            items: currentQueue.items.map((q) =>
              q.id === queueId ? { ...q, status: 'completed' } : q
            )
          }
        }
      };
    });
    console.log('[Queue] 完成离场:', courtId, queueId);
  },

  insertVip: (courtId, userName, peopleCount, userId) => {
    const vipItem = get().joinQueue(courtId, userName, peopleCount, 'vip', userId);
    console.log('[Queue] VIP插队:', courtId, vipItem.queueNumber);
    return vipItem;
  },

  insertEmergency: (courtId, userName, peopleCount) => {
    const emergencyItem = get().joinQueue(courtId, userName, peopleCount, 'emergency');
    console.log('[Queue] 应急插队:', courtId, emergencyItem.queueNumber);
    return emergencyItem;
  },

  getCourtQueue: (courtId) => {
    return get().courtQueues[courtId]?.items || [];
  },

  getSortedCourtQueue: (courtId) => {
    const items = get().courtQueues[courtId]?.items || [];
    return sortQueueByPriority(items);
  },

  getCourtWaitingCount: (courtId) => {
    const items = get().courtQueues[courtId]?.items || [];
    return items.filter((q) => q.status === 'waiting').length;
  },

  getCourtCurrentCalled: (courtId) => {
    const sorted = get().getSortedCourtQueue(courtId);
    return sorted.find((q) => q.status === 'called') || null;
  },

  getCourtCurrentPlaying: (courtId) => {
    const sorted = get().getSortedCourtQueue(courtId);
    return sorted.find((q) => q.status === 'playing') || null;
  },

  getAllWaitingCount: () => {
    const allQueues = Object.values(get().courtQueues);
    return allQueues.reduce(
      (acc, q) => acc + q.items.filter((item) => item.status === 'waiting').length,
      0
    );
  }
}));
