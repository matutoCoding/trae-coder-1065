import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useQueueStore } from '@/store/queue';
import QueueItemCard from '@/components/QueueItem';
import PriorityBadge from '@/components/PriorityBadge';
import type { PriorityLevel, QueueItem } from '@/types';
import styles from './index.module.scss';

type QueueTab = 'waiting' | 'all' | 'history';

const TAB_FILTERS: { key: QueueTab; label: string }[] = [
  { key: 'waiting', label: '等待中' },
  { key: 'all', label: '全部' },
  { key: 'history', label: '已完成' }
];

const QueuePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QueueTab>('waiting');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queue = useQueueStore((s) => s.queue);
  const getSortedQueue = useQueueStore((s) => s.getSortedQueue);
  const getWaitingCount = useQueueStore((s) => s.getWaitingCount);
  const joinQueue = useQueueStore((s) => s.joinQueue);
  const insertVip = useQueueStore((s) => s.insertVip);
  const insertEmergency = useQueueStore((s) => s.insertEmergency);
  const callNext = useQueueStore((s) => s.callNext);
  const callSpecific = useQueueStore((s) => s.callSpecific);
  const markPlaying = useQueueStore((s) => s.markPlaying);
  const markCompleted = useQueueStore((s) => s.markCompleted);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);

  const sortedQueue = useMemo(() => getSortedQueue(), [queue, getSortedQueue]);

  const stats = useMemo(() => {
    return {
      waiting: queue.filter((q) => q.status === 'waiting').length,
      called: queue.filter((q) => q.status === 'called').length,
      playing: queue.filter((q) => q.status === 'playing').length
    };
  }, [queue]);

  const currentCalled = useMemo(() => {
    return sortedQueue.find((q) => q.status === 'called') || null;
  }, [sortedQueue]);

  const playingItem = useMemo(() => {
    return sortedQueue.find((q) => q.status === 'playing') || null;
  }, [sortedQueue]);

  const filteredQueue = useMemo(() => {
    switch (activeTab) {
      case 'waiting':
        return sortedQueue.filter((q) => q.status === 'waiting');
      case 'all':
        return sortedQueue.filter(
          (q) => q.status === 'waiting' || q.status === 'called' || q.status === 'playing'
        );
      case 'history':
        return sortedQueue.filter((q) => q.status === 'completed');
      default:
        return sortedQueue;
    }
  }, [sortedQueue, activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'none' });
    }, 800);
  };

  const showNameInput = (
    priority: PriorityLevel,
    defaultName: string = ''
  ): Promise<{ name: string; count: number } | null> => {
    return new Promise((resolve) => {
      Taro.showModal({
        title: priority === 'vip' ? 'VIP取号' : priority === 'emergency' ? '应急取号' : '取号排队',
        editable: true,
        placeholderText: '请输入姓名',
        content: defaultName,
        confirmText: '确认取号',
        confirmColor: '#22c55e',
        success: (res) => {
          if (res.confirm && res.content) {
            const name = res.content.trim();
            if (name) {
              Taro.showModal({
                title: '人数',
                editable: true,
                placeholderText: '请输入人数（1-8）',
                content: '2',
                confirmText: '确定',
                success: (countRes) => {
                  if (countRes.confirm && countRes.content) {
                    const count = parseInt(countRes.content, 10);
                    resolve({ name, count: isNaN(count) || count < 1 ? 2 : Math.min(count, 8) });
                  } else {
                    resolve(null);
                  }
                }
              });
            } else {
              Taro.showToast({ title: '请输入姓名', icon: 'none' });
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      });
    });
  };

  const handleJoinQueue = async (priority: PriorityLevel) => {
    const input = await showNameInput(priority);
    if (!input) return;

    let result: QueueItem;
    if (priority === 'vip') {
      result = insertVip(input.name, input.count);
    } else if (priority === 'emergency') {
      result = insertEmergency(input.name, input.count);
    } else {
      result = joinQueue(input.name, input.count, priority);
    }

    Taro.showToast({
      title: `取号成功 NO.${result.queueNumber}`,
      icon: 'success',
      duration: 2000
    });
    console.log('[QueuePage] 取号成功:', result.queueNumber, priority);
  };

  const handleCallNext = () => {
    if (getWaitingCount() === 0) {
      Taro.showToast({ title: '暂无等待人员', icon: 'none' });
      return;
    }
    const called = callNext();
    if (called) {
      Taro.vibrateShort && Taro.vibrateShort({ type: 'medium' });
      Taro.showToast({
        title: `叫号 NO.${called.queueNumber}`,
        icon: 'success',
        duration: 2000
      });
    }
  };

  const handleCallSpecific = (id: string) => {
    callSpecific(id);
    Taro.vibrateShort && Taro.vibrateShort({ type: 'light' });
    Taro.showToast({ title: '叫号成功', icon: 'success' });
  };

  const handleMarkPlaying = (id: string) => {
    markPlaying(id);
    Taro.showToast({ title: '已确认上场', icon: 'success' });
  };

  const handleMarkCompleted = (id: string) => {
    markCompleted(id);
    Taro.showToast({ title: '已完成离场', icon: 'success' });
  };

  const handleLeave = (id: string) => {
    Taro.showModal({
      title: '确认离队',
      content: '确定要让该用户离队吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          leaveQueue(id);
          Taro.showToast({ title: '已离队', icon: 'success' });
        }
      }
    });
  };

  const getDisplayNumber = (item: QueueItem): number => {
    if (item.status !== 'waiting') return 0;
    const waitingList = sortedQueue.filter((q) => q.status === 'waiting');
    return waitingList.findIndex((q) => q.id === item.id) + 1;
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.topSection}>
        <Text className={styles.pageTitle}>📢 排队叫号</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.waiting}</Text>
            <Text className={styles.statLabel}>等待中</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.called}</Text>
            <Text className={styles.statLabel}>已叫号</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.playing}</Text>
            <Text className={styles.statLabel}>上场中</Text>
          </View>
        </View>
      </View>

      <View className={styles.currentCallSection}>
        <View className={styles.currentCallBg}>🎾</View>
        <Text className={styles.currentCallLabel}>
          {currentCalled ? '📣 当前叫号' : playingItem ? '🏃 上场中' : '暂无叫号'}
        </Text>
        {currentCalled && (
          <>
            <Text className={styles.currentCallNumber}>NO. {currentCalled.queueNumber}</Text>
            <Text className={styles.currentCallUser}>
              {currentCalled.userName} · {currentCalled.peopleCount}人
            </Text>
            <Text className={styles.currentCallTime}>
              叫号时间：{currentCalled.calledAt ? dayjs(currentCalled.calledAt).format('HH:mm:ss') : '-'}
            </Text>
          </>
        )}
        {playingItem && !currentCalled && (
          <>
            <Text className={styles.currentCallNumber}>NO. {playingItem.queueNumber}</Text>
            <Text className={styles.currentCallUser}>
              {playingItem.userName} · {playingItem.peopleCount}人
            </Text>
            <Text className={styles.currentCallTime}>正在打球中</Text>
          </>
        )}
        {!currentCalled && !playingItem && (
          <Text style={{ fontSize: 28, color: 'rgba(0,0,0,0.6)', marginTop: 16 }}>
            暂无叫号，请点击下方按钮开始叫号
          </Text>
        )}
      </View>

      <View className={styles.actionsSection}>
        <View className={styles.actionsGrid}>
          <View className={styles.actionCard} onClick={() => handleJoinQueue('normal')}>
            <View className={classnames(styles.actionIcon, styles.normal)}>
              <Text>🎾</Text>
            </View>
            <Text className={styles.actionTitle}>普通取号</Text>
            <Text className={styles.actionDesc}>按顺序排队</Text>
          </View>
          <View className={classnames(styles.actionCard, styles.vip)} onClick={() => handleJoinQueue('vip')}>
            <View className={classnames(styles.actionIcon, styles.vip)}>
              <Text>👑</Text>
            </View>
            <Text className={styles.actionTitle}>VIP取号</Text>
            <Text className={styles.actionDesc}>优先插队</Text>
          </View>
          <View className={classnames(styles.actionCard, styles.emergency)} onClick={() => handleJoinQueue('emergency')}>
            <View className={classnames(styles.actionIcon, styles.emergency)}>
              <Text>⚡</Text>
            </View>
            <Text className={styles.actionTitle}>应急插队</Text>
            <Text className={styles.actionDesc}>最高优先级</Text>
          </View>
        </View>
      </View>

      <View className={styles.callNextSection}>
        <View
          className={classnames(
            styles.callNextBtn,
            getWaitingCount() === 0 && styles.disabled
          )}
          onClick={handleCallNext}
        >
          <Text>🔔 呼叫下一位</Text>
        </View>
      </View>

      <View className={styles.queueSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>排队列表</Text>
          <View className={styles.sectionCount}>
            <Text>{activeTab === 'waiting' ? stats.waiting : filteredQueue.length}人</Text>
          </View>
        </View>

        <View className={styles.priorityLegend}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.emergency)} />
            <Text>应急（最高）</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.vip)} />
            <Text>VIP（优先）</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.normal)} />
            <Text>普通（排队）</Text>
          </View>
        </View>

        <View className={styles.queueTabs}>
          {TAB_FILTERS.map((tab) => (
            <View
              key={tab.key}
              className={classnames(
                styles.queueTab,
                activeTab === tab.key && styles.active
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </View>

        <View className={styles.queueList}>
          {filteredQueue.length === 0 ? (
            <View className={styles.emptyQueue}>
              <View className={styles.emptyEmoji}>✨</View>
              <Text className={styles.emptyText}>
                {activeTab === 'waiting'
                  ? '暂无等待人员'
                  : activeTab === 'history'
                    ? '暂无历史记录'
                    : '暂无排队数据'}
              </Text>
            </View>
          ) : (
            filteredQueue.map((item, idx) => (
              <QueueItemCard
                key={item.id}
                item={item}
                position={getDisplayNumber(item)}
                onCall={handleCallSpecific}
                onMarkPlaying={handleMarkPlaying}
                onMarkCompleted={handleMarkCompleted}
                onLeave={handleLeave}
                showActions={true}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default QueuePage;
