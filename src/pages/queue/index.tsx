import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useQueueStore } from '@/store/queue';
import { courts } from '@/data/courts';
import QueueItemCard from '@/components/QueueItem';
import PriorityBadge from '@/components/PriorityBadge';
import type { PriorityLevel, QueueItem } from '@/types';
import styles from './index.module.scss';

type QueueTab = 'waiting' | 'all' | 'no_show' | 'history';

const TAB_FILTERS: { key: QueueTab; label: string }[] = [
  { key: 'waiting', label: '等待中' },
  { key: 'all', label: '全部' },
  { key: 'no_show', label: '过号' },
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
  const getCourtNoShowList = useQueueStore((s) => s.getCourtNoShowList);
  const defaultCallExpireSeconds = useQueueStore((s) => s.defaultCallExpireSeconds);
  const joinQueue = useQueueStore((s) => s.joinQueue);
  const insertVip = useQueueStore((s) => s.insertVip);
  const insertEmergency = useQueueStore((s) => s.insertEmergency);
  const callNext = useQueueStore((s) => s.callNext);
  const callSpecific = useQueueStore((s) => s.callSpecific);
  const markPlaying = useQueueStore((s) => s.markPlaying);
  const markCompleted = useQueueStore((s) => s.markCompleted);
  const markNoShow = useQueueStore((s) => s.markNoShow);
  const restoreNoShow = useQueueStore((s) => s.restoreNoShow);
  const checkExpiredCalls = useQueueStore((s) => s.checkExpiredCalls);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showExpirePicker, setShowExpirePicker] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'next' | 'specific'>('next');
  const [pendingCallId, setPendingCallId] = useState<string>('');
  const [selectedExpireSeconds, setSelectedExpireSeconds] = useState(120);
  const [customExpireMinutes, setCustomExpireMinutes] = useState('');

  const EXPIRE_OPTIONS = [
    { label: '1分钟', seconds: 60 },
    { label: '2分钟', seconds: 120 },
    { label: '5分钟', seconds: 300 },
    { label: '自定义', seconds: -1 }
  ];

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
      case 'no_show':
        return getCourtNoShowList(selectedCourtId);
      case 'history':
        return sortedCourtQueue.filter((q) => q.status === 'completed' || q.status === 'no_show');
      default:
        return sortedCourtQueue;
    }
  }, [sortedCourtQueue, activeTab, selectedCourtId, getCourtNoShowList]);

  useEffect(() => {
    if (currentCalled && currentCalled.calledAt && currentCalled.callExpireSeconds) {
      const updateRemaining = () => {
        const calledTime = dayjs(currentCalled.calledAt);
        const expireTime = calledTime.add(currentCalled.callExpireSeconds, 'second');
        const remaining = Math.max(0, expireTime.diff(dayjs(), 'second'));
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          checkExpiredCalls(selectedCourtId);
        }
      };

      updateRemaining();
      timerRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      setRemainingSeconds(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [currentCalled, selectedCourtId, checkExpiredCalls]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    setPendingCallType('next');
    setPendingCallId('');
    setSelectedExpireSeconds(120);
    setCustomExpireMinutes('');
    setShowExpirePicker(true);
  };

  const handleCallSpecific = (id: string) => {
    setPendingCallType('specific');
    setPendingCallId(id);
    setSelectedExpireSeconds(120);
    setCustomExpireMinutes('');
    setShowExpirePicker(true);
  };

  const confirmCallWithExpire = () => {
    let expireSeconds = selectedExpireSeconds;
    if (selectedExpireSeconds === -1) {
      const minutes = parseInt(customExpireMinutes, 10);
      if (isNaN(minutes) || minutes < 1 || minutes > 30) {
        Taro.showToast({ title: '请输入1-30分钟', icon: 'none' });
        return;
      }
      expireSeconds = minutes * 60;
    }

    setShowExpirePicker(false);

    if (pendingCallType === 'next') {
      const called = callNext(selectedCourtId, expireSeconds);
      if (called) {
        Taro.vibrateShort && Taro.vibrateShort({ type: 'medium' });
        Taro.showToast({
          title: `${selectedCourt?.name} NO.${called.queueNumber}`,
          icon: 'success',
          duration: 2000
        });
        console.log('[QueuePage] 叫号成功，等待时间:', expireSeconds, '秒');
      }
    } else {
      callSpecific(selectedCourtId, pendingCallId, expireSeconds);
      Taro.vibrateShort && Taro.vibrateShort({ type: 'light' });
      Taro.showToast({ title: '叫号成功', icon: 'success' });
      console.log('[QueuePage] 指定叫号成功，等待时间:', expireSeconds, '秒');
    }
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

  const handleMarkNoShow = (id: string) => {
    Taro.showModal({
      title: '标记过号',
      content: '确定要标记该用户为过号吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          markNoShow(selectedCourtId, id);
          Taro.showToast({ title: '已标记过号', icon: 'success' });
        }
      }
    });
  };

  const handleRestoreNoShow = (id: string) => {
    Taro.showModal({
      title: '恢复排队',
      content: '确定要将该用户恢复到等待队列吗？恢复后按优先级重新排序。',
      confirmColor: '#22c55e',
      success: (res) => {
        if (res.confirm) {
          restoreNoShow(selectedCourtId, id);
          Taro.showToast({ title: '已恢复排队', icon: 'success' });
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
            <View className={styles.countdownRow}>
              <Text className={styles.countdownLabel}>到场倒计时</Text>
              <Text className={classnames(
                styles.countdownValue,
                remainingSeconds <= 30 && styles.urgent
              )}>
                ⏱ {formatTime(remainingSeconds)}
              </Text>
            </View>
            <View className={styles.callActions}>
              <View
                className={classnames(styles.callActionBtn, styles.primary)}
                onClick={() => handleMarkPlaying(currentCalled.id)}
              >
                <Text>✓ 已到场</Text>
              </View>
              <View
                className={classnames(styles.callActionBtn, styles.danger)}
                onClick={() => handleMarkNoShow(currentCalled.id)}
              >
                <Text>✕ 过号</Text>
              </View>
            </View>
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
                onRestore={handleRestoreNoShow}
                onMarkNoShow={handleMarkNoShow}
                showActions={true}
              />
            ))
          )}
        </View>
      </View>

      {showExpirePicker && (
        <View className={styles.expirePickerModal} onClick={() => setShowExpirePicker(false)}>
          <View className={styles.expirePickerContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.expirePickerHeader}>
              <Text className={styles.expirePickerTitle}>设置到场等待时间</Text>
              <Text className={styles.expirePickerClose} onClick={() => setShowExpirePicker(false)}>
                ✕
              </Text>
            </View>

            <View className={styles.expirePickerBody}>
              <Text className={styles.expirePickerHint}>
                叫号后用户需在设定时间内到场确认，超时将自动过号
              </Text>

              <View className={styles.expireOptionsGrid}>
                {EXPIRE_OPTIONS.map((option) => (
                  <View
                    key={option.seconds}
                    className={classnames(
                      styles.expireOption,
                      selectedExpireSeconds === option.seconds && styles.expireOptionSelected
                    )}
                    onClick={() => {
                      setSelectedExpireSeconds(option.seconds);
                      if (option.seconds !== -1) {
                        setCustomExpireMinutes('');
                      }
                    }}
                  >
                    <Text className={styles.expireOptionLabel}>{option.label}</Text>
                    {option.seconds !== -1 && (
                      <Text className={styles.expireOptionDesc}>
                        {option.seconds >= 60 ? `${option.seconds / 60}分钟` : `${option.seconds}秒`}
                      </Text>
                    )}
                    {selectedExpireSeconds === option.seconds && (
                      <Text className={styles.expireOptionCheck}>✓</Text>
                    )}
                  </View>
                ))}
              </View>

              {selectedExpireSeconds === -1 && (
                <View className={styles.customExpireSection}>
                  <Text className={styles.customExpireLabel}>请输入等待时间（1-30分钟）</Text>
                  <View className={styles.customExpireInput}>
                    <Input
                      type="number"
                      className={styles.customExpireInputField}
                      placeholder="请输入分钟数"
                      value={customExpireMinutes}
                      onInput={(e) => setCustomExpireMinutes(e.detail.value)}
                      min="1"
                      max="30"
                    />
                    <Text className={styles.customExpireUnit}>分钟</Text>
                  </View>
                </View>
              )}

              <View
                className={classnames(
                  styles.confirmExpireBtn,
                  selectedExpireSeconds === -1 && !customExpireMinutes && styles.disabled
                )}
                onClick={confirmCallWithExpire}
              >
                <Text className={styles.confirmExpireBtnText}>
                  确认叫号
                  {selectedExpireSeconds !== -1 && `（${selectedExpireSeconds / 60}分钟）`}
                  {selectedExpireSeconds === -1 && customExpireMinutes && `（${customExpireMinutes}分钟）`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default QueuePage;
