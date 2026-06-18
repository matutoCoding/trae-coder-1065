import { create } from 'zustand';
import dayjs from 'dayjs';
import type { QueueItem, PriorityLevel } from '@/types';
import { initialQueue, sortQueueByPriority } from '@/data/queue';
import { generateUniqueId } from '@/utils/time';

interface QueueStore {
  queue: QueueItem[];
  nextQueueNumber: number;
  joinQueue: (
    userName: string,
    peopleCount: number,
    priority: PriorityLevel,
    userId?: string
  ) => QueueItem;
  leaveQueue: (queueId: string) => void;
  callNext: () => QueueItem | null;
  callSpecific: (queueId: string) => void;
  markPlaying: (queueId: string) => void;
  markCompleted: (queueId: string) => void;
  insertVip: (
    userName: string,
    peopleCount: number,
    userId?: string
  ) => QueueItem;
  insertEmergency: (
    userName: string,
    peopleCount: number,
    reason?: string
  ) => QueueItem;
  getSortedQueue: () => QueueItem[];
  getWaitingCount: () => number;
  getEstimatedWaitForPosition: (position: number) => number;
}

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  normal: '普通',
  vip: 'VIP',
  emergency: '应急'
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  queue: initialQueue,
  nextQueueNumber: 108,

  joinQueue: (userName, peopleCount, priority = 'normal', userId = `user_${Date.now()}`) => {
    const newItem: QueueItem = {
      id: generateUniqueId('q_'),
      queueNumber: get().nextQueueNumber,
      userId,
      userName,
      priority,
      priorityLabel: PRIORITY_LABELS[priority],
      status: 'waiting',
      estimatedWaitTime: 0,
      peopleCount,
      joinedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    };

    set((state) => ({
      queue: [...state.queue, newItem],
      nextQueueNumber: state.nextQueueNumber + 1
    }));

    console.log('[Queue] 加入排队:', newItem.queueNumber, newItem.userName);
    return get().queue.find((q) => q.id === newItem.id) || newItem;
  },

  leaveQueue: (queueId) => {
    set((state) => ({
      queue: state.queue.filter((q) => q.id !== queueId)
    }));
    console.log('[Queue] 离队:', queueId);
  },

  callNext: () => {
    const sorted = get().getSortedQueue();
    const nextItem = sorted.find((q) => q.status === 'waiting');

    if (!nextItem) {
      console.log('[Queue] 没有等待中的人员');
      return null;
    }

    set((state) => ({
      queue: state.queue.map((q) =>
        q.id === nextItem.id
          ? { ...q, status: 'called', calledAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : q
      )
    }));

    console.log('[Queue] 叫号:', nextItem.queueNumber, nextItem.userName);
    return get().queue.find((q) => q.id === nextItem.id) || null;
  },

  callSpecific: (queueId) => {
    set((state) => ({
      queue: state.queue.map((q) =>
        q.id === queueId && q.status === 'waiting'
          ? { ...q, status: 'called', calledAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : q
      )
    }));
    console.log('[Queue] 指定叫号:', queueId);
  },

  markPlaying: (queueId) => {
    set((state) => ({
      queue: state.queue.map((q) =>
        q.id === queueId ? { ...q, status: 'playing' } : q
      )
    }));
    console.log('[Queue] 已上场:', queueId);
  },

  markCompleted: (queueId) => {
    set((state) => ({
      queue: state.queue.map((q) =>
        q.id === queueId ? { ...q, status: 'completed' } : q
      )
    }));
    console.log('[Queue] 完成离场:', queueId);
  },

  insertVip: (userName, peopleCount, userId) => {
    const vipItem = get().joinQueue(userName, peopleCount, 'vip', userId);
    console.log('[Queue] VIP插队:', vipItem.queueNumber);
    return vipItem;
  },

  insertEmergency: (userName, peopleCount) => {
    const emergencyItem = get().joinQueue(userName, peopleCount, 'emergency');
    console.log('[Queue] 应急插队:', emergencyItem.queueNumber);
    return emergencyItem;
  },

  getSortedQueue: () => {
    return sortQueueByPriority(get().queue);
  },

  getWaitingCount: () => {
    return get().queue.filter((q) => q.status === 'waiting').length;
  },

  getEstimatedWaitForPosition: (position) => {
    return position * 15;
  }
}));
