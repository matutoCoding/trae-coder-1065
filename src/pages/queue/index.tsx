import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useQueueStore } from '@/store/queue';
import { courts } from '@/data/courts';
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
  const availableCourts = useMemo(() => courts.filter((c) => c.status === 'available'), []);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(availableCourts[0]?.id || '');
  const [activeTab, setActiveTab] = useState<QueueTab>('waiting');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const courtQueues = useQueueStore((s) => s.courtQueues);
  const getSortedCourtQueue = useQueueStore((s) => s.getSortedCourtQueue);
  const getCourtWaitingCount = useQueueStore((s) => s.getCourtWaitingCount);
  const getCourtCurrentCalled = useQueueStore((s) => s.getCourtCurrentCalled);
  const getCourtCurrentPlaying = useQueueStore((s) => s.getCourtCurrentPlaying);
  const joinQueue = useQueueStore((s) => s.joinQueue);
  const insertVip = useQueueStore((s) => s.insertVip);
  const insertEmergency = useQueueStore((s) => s.insertEmergency);
  const callNext = useQueueStore((s) => s.callNext);
  const callSpecific = useQueueStore((s) => s.callSpecific);
  const markPlaying = useQueueStore((s) => s.markPlaying);
  const markCompleted = useQueueStore((s) => s.markCompleted);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);

  const selectedCourt = useMemo(
    () => courts.find((c) => c.id === selectedCourtId),
    [selectedCourtId]
  );

  const currentCourtQueue = useMemo(() => {
    return courtQueues[selectedCourtId]?.items || [];
  }, [courtQueues, selectedCourtId]);

  const sortedCourtQueue = useMemo(() => {
    return getSortedCourtQueue(selectedCourtId);
  }, [selectedCourtId, getSortedCourtQueue, courtQueues]);

  const stats = useMemo(() => {
    const queue = currentCourtQueue;
    return {
      waiting: queue.filter((q) => q.status === 'waiting').length,
      called: queue.filter((q) => q.status === 'called').length,
      playing: queue.filter((q) => q.status === 'playing').length
    };
  }, [currentCourtQueue]);

  const currentCalled = useMemo(() => {
    return getCourtCurrentCalled(selectedCourtId);
  }, [selectedCourtId, getCourtCurrentCalled, courtQueues]);

  const playingItem = useMemo(() => {
    return getCourtCurrentPlaying(selectedCourtId);
  }, [selectedCourtId, getCourtCurrentPlaying, courtQueues]);

  const filteredQueue = useMemo(() => {
    switch (activeTab) {
      case 'waiting':
        return sortedCourtQueue.filter((q) => q.status === 'waiting');
      case 'all':
        return sortedCourtQueue.filter(
          (q) => q.status === 'waiting' || q.status === 'called' || q.status === 'playing'
        );
      case 'history':
        return sortedCourtQueue.filter((q) => q.status === 'completed');
      default:
        return sortedCourtQueue;
    }
  }, [sortedCourtQueue, activeTab]);

  const handleCourtChange = useCallback((courtId: string) => {
    setSelectedCourtId(courtId);
    console.log('[QueuePage] 切换场地:', courtId);
  }, []);

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
      result = insertVip(selectedCourtId, input.name, input.count);
    } else if (priority === 'emergency') {
      result = insertEmergency(selectedCourtId, input.name, input.count);
    } else {
      result = joinQueue(selectedCourtId, input.name, input.count, priority);
    }

    Taro.showToast({
      title: `${selectedCourt?.name} NO.${result.queueNumber}`,
      icon: 'success',
      duration: 2000
    });
    console.log(
      '[QueuePage] 取号成功:',
      selectedCourt?.name,
      result.queueNumber,
      priority
    );
  };

  const handleCallNext = () => {
    if (getCourtWaitingCount(selectedCourtId) === 0) {
      Taro.showToast({ title: '暂无等待人员', icon: 'none' });
      return;
    }
    const called = callNext(selectedCourtId);
    if (called) {
      Taro.vibrateShort && Taro.vibrateShort({ type: 'medium' });
      Taro.showToast({
        title: `${selectedCourt?.name} NO.${called.queueNumber}`,
        icon: 'success',
        duration: 2000
      });
    }
  };

  const handleCallSpecific = (id: string) => {
    callSpecific(selectedCourtId, id);
    Taro.vibrateShort && Taro.vibrateShort({ type: 'light' });
    Taro.showToast({ title: '叫号成功', icon: 'success' });
  };

  const handleMarkPlaying = (id: string) => {
    markPlaying(selectedCourtId, id);
    Taro.showToast({ title: '已确认上场', icon: 'success' });
  };

  const handleMarkCompleted = (id: string) => {
    markCompleted(selectedCourtId, id);
    Taro.showToast({ title: '已完成离场', icon: 'success' });
  };

  const handleLeave = (id: string) => {
    Taro.showModal({
      title: '确认离队',
      content: '确定要让该用户离队吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          leaveQueue(selectedCourtId, id);
          Taro.showToast({ title: '已离队', icon: 'success' });
        }
      }
    });
  };

  const getDisplayNumber = (item: QueueItem): number => {
    if (item.status !== 'waiting') return 0;
    const waitingList = sortedCourtQueue.filter((q) => q.status === 'waiting');
    return waitingList.findIndex((q) => q.id === item.id) + 1;
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      refresherTriggered={isRefreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.topSection}>
        <Text className={styles.pageTitle}>📢 排队叫号</Text>

        <View className={styles.courtSelector}>
          <Text className={styles.courtSelectorLabel}>选择场地</Text>
          <ScrollView scrollX className={styles.courtTabsScroll} enhanced showScrollbar={false}>
            <View className={styles.courtTabs}>
              {availableCourts.map((court) => {
                const waitingCount = getCourtWaitingCount(court.id);
                return (
                  <View
                    key={court.id}
                    className={classnames(
                      styles.courtTab,
                      selectedCourtId === court.id && styles.active
                    )}
                    onClick={() => handleCourtChange(court.id)}
                  >
                    <Text className={styles.courtTabName}>{court.name}</Text>
                    <Text className={styles.courtTabBadge}>{waitingCount}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

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
              {selectedCourt?.name} · 叫号时间：{currentCalled.calledAt ? dayjs(currentCalled.calledAt).format('HH:mm:ss') : '-'}
            </Text>
          </>
        )}
        {playingItem && !currentCalled && (
          <>
            <Text className={styles.currentCallNumber}>NO. {playingItem.queueNumber}</Text>
            <Text className={styles.currentCallUser}>
              {playingItem.userName} · {playingItem.peopleCount}人
            </Text>
            <Text className={styles.currentCallTime}>
              {selectedCourt?.name} · 正在打球中
            </Text>
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
            <Text className={styles.actionDesc}>{selectedCourt?.name}</Text>
          </View>
          <View className={classnames(styles.actionCard, styles.vip)} onClick={() => handleJoinQueue('vip')}>
            <View className={classnames(styles.actionIcon, styles.vip)}>
              <Text>👑</Text>
            </View>
            <Text className={styles.actionTitle}>VIP取号</Text>
            <Text className={styles.actionDesc}>{selectedCourt?.name} 优先</Text>
          </View>
          <View className={classnames(styles.actionCard, styles.emergency)} onClick={() => handleJoinQueue('emergency')}>
            <View className={classnames(styles.actionIcon, styles.emergency)}>
              <Text>⚡</Text>
            </View>
            <Text className={styles.actionTitle}>应急插队</Text>
            <Text className={styles.actionDesc}>{selectedCourt?.name} 最高</Text>
          </View>
        </View>
      </View>

      <View className={styles.callNextSection}>
        <View
          className={classnames(
            styles.callNextBtn,
            getCourtWaitingCount(selectedCourtId) === 0 && styles.disabled
          )}
          onClick={handleCallNext}
        >
          <Text>🔔 {selectedCourt?.name} 呼叫下一位</Text>
        </View>
      </View>

      <View className={styles.queueSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>{selectedCourt?.name} 排队列表</Text>
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
