import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { useBookingStore } from '@/store/booking';
import { useQueueStore } from '@/store/queue';
import { courts } from '@/data/courts';
import { coaches } from '@/data/coaches';
import styles from './index.module.scss';

const DashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getDailyStats = useBookingStore((s) => s.getDailyStats);
  const getCourtWaitingCount = useQueueStore((s) => s.getCourtWaitingCount);
  const getTotalNoShowCount = useQueueStore((s) => s.getTotalNoShowCount);
  const courtQueues = useQueueStore((s) => s.courtQueues);

  const stats = useMemo(() => {
    return getDailyStats(selectedDate);
  }, [selectedDate, getDailyStats]);

  const totalQueueCount = useMemo(() => {
    return courts.reduce((total, court) => {
      return total + getCourtWaitingCount(court.id);
    }, 0);
  }, [getCourtWaitingCount]);

  const totalNoShowCount = useMemo(() => {
    return getTotalNoShowCount();
  }, [getTotalNoShowCount]);

  const averageBookingRate = useMemo(() => {
    if (stats.courtStats.length === 0) return 0;
    const total = stats.courtStats.reduce((sum, c) => sum + c.rate, 0);
    return Math.round(total / stats.courtStats.length);
  }, [stats.courtStats]);

  const averageCoachRate = useMemo(() => {
    if (stats.coachStats.length === 0) return 0;
    const total = stats.coachStats.reduce((sum, c) => sum + c.rate, 0);
    return Math.round(total / stats.coachStats.length);
  }, [stats.coachStats]);

  const isToday = useMemo(() => {
    return dayjs(selectedDate).isSame(dayjs(), 'day');
  }, [selectedDate]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    const nextDay = dayjs(selectedDate).add(1, 'day');
    if (nextDay.isAfter(dayjs().endOf('day'))) {
      Taro.showToast({ title: '不能查看未来日期', icon: 'none' });
      return;
    }
    setSelectedDate(nextDay.format('YYYY-MM-DD'));
  }, [selectedDate]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'none' });
    }, 800);
  };

  const handleJumpToBooking = useCallback((courtId?: string) => {
    const params: Record<string, string> = {};
    if (courtId) {
      params.courtId = courtId;
    }
    if (selectedDate) {
      params.date = selectedDate;
    }
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join('&');
    Taro.navigateTo({ url: `/pages/booking/index${query ? '?' + query : ''}` });
  }, [selectedDate]);

  const handleJumpToQueue = useCallback((courtId?: string) => {
    const params: Record<string, string> = {};
    if (courtId) {
      params.courtId = courtId;
    }
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join('&');
    Taro.navigateTo({ url: `/pages/queue/index${query ? '?' + query : ''}` });
  }, []);

  const handleJumpToCoach = useCallback((coachId?: string) => {
    const params: Record<string, string> = {};
    if (coachId) {
      params.coachId = coachId;
    }
    if (selectedDate) {
      params.date = selectedDate;
    }
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join('&');
    Taro.navigateTo({ url: `/pages/coach/index${query ? '?' + query : ''}` });
  }, [selectedDate]);

  const handleJumpToMyBookings = useCallback(() => {
    Taro.switchTab({ url: '/pages/mybookings/index' });
  }, []);

  const getRateClass = (rate: number) => {
    if (rate >= 70) return 'high';
    if (rate >= 40) return 'medium';
    return 'low';
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(0)}`;
  };

  const formatDateDisplay = (date: string) => {
    const d = dayjs(date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.format('MM月DD日')} ${weekdays[d.day()]}`;
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      refresherTriggered={isRefreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.pageTitle}>
        <Text>📊</Text>
        <Text>运营中心</Text>
      </View>

      <View className={styles.dateSelector}>
        <View className={styles.dateNavBtn} onClick={handlePrevDay}>
          <Text>‹</Text>
        </View>
        <View className={styles.dateText}>
          <Text>{formatDateDisplay(selectedDate)}</Text>
          {isToday && <Text className={styles.todayLabel}>今天</Text>}
        </View>
        <View className={styles.dateNavBtn} onClick={handleNextDay}>
          <Text>›</Text>
        </View>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statCard} onClick={() => handleJumpToBooking()}>
          <View className={styles.statCardHeader}>
            <Text className={styles.statLabel}>预约率</Text>
            <View className={`${styles.statIcon} ${styles.booking}`}>📅</View>
          </View>
          <Text className={styles.statValue}>
            {averageBookingRate}
            <Text className={styles.statUnit}>%</Text>
          </Text>
          <Text className={styles.statChange}>共{stats.totalBookings}笔预约</Text>
        </View>

        <View className={styles.statCard} onClick={() => handleJumpToMyBookings()}>
          <View className={styles.statCardHeader}>
            <Text className={styles.statLabel}>营业收入</Text>
            <View className={`${styles.statIcon} ${styles.revenue}`}>💰</View>
          </View>
          <Text className={`${styles.statValue} ${styles.revenue}`}>
            {formatCurrency(stats.revenue.total)}
          </Text>
          <Text className={styles.statChange}>
            场地{formatCurrency(stats.revenue.courtFees)} · 教练{formatCurrency(stats.revenue.coachFees)}
          </Text>
        </View>

        <View className={styles.statCard} onClick={() => handleJumpToQueue()}>
          <View className={styles.statCardHeader}>
            <Text className={styles.statLabel}>排队中</Text>
            <View className={`${styles.statIcon} ${styles.queue}`}>👥</View>
          </View>
          <Text className={styles.statValue}>
            {totalQueueCount}
            <Text className={styles.statUnit}>人</Text>
          </Text>
          <Text className={styles.statChange}>
            {Object.keys(courtQueues).length}个场地队列
          </Text>
        </View>

        <View className={styles.statCard} onClick={() => handleJumpToCoach()}>
          <View className={styles.statCardHeader}>
            <Text className={styles.statLabel}>教练利用率</Text>
            <View className={`${styles.statIcon} ${styles.coach}`}>🎾</View>
          </View>
          <Text className={styles.statValue}>
            {averageCoachRate}
            <Text className={styles.statUnit}>%</Text>
          </Text>
          <Text className={styles.statChange}>共{coaches.length}位教练</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>场地预约率</Text>
          <Text className={styles.sectionAction} onClick={() => handleJumpToBooking()}>
            查看排期 ›
          </Text>
        </View>
        <View className={styles.courtList}>
          {stats.courtStats.map((court) => (
            <View
              key={court.courtId}
              className={styles.courtItem}
              onClick={() => handleJumpToBooking(court.courtId)}
            >
              <View className={styles.courtInfo}>
                <Text className={styles.courtName}>{court.courtName}</Text>
                <View className={styles.courtStats}>
                  <Text className={`${styles.courtRate} ${getRateClass(court.rate)}`}>
                    {court.rate}%
                  </Text>
                  <Text>
                    {court.bookedSlots}/{court.totalSlots} 时段
                  </Text>
                  <View className={styles.rateBar}>
                    <View
                      className={`${styles.rateBarFill} ${getRateClass(court.rate)}`}
                      style={{ width: `${Math.min(court.rate, 100)}%` }}
                    />
                  </View>
                </View>
              </View>
              <Text className={styles.arrow}>›</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收入明细</Text>
          <Text className={styles.sectionAction} onClick={() => handleJumpToMyBookings()}>
            账单详情 ›
          </Text>
        </View>
        <View className={styles.revenueBreakdown}>
          <View className={styles.revenueRow}>
            <Text className={styles.revenueLabel}>场地费</Text>
            <Text className={`${styles.revenueAmount} ${styles.positive}`}>
              +{formatCurrency(stats.revenue.courtFees)}
            </Text>
          </View>
          <View className={styles.revenueRow}>
            <Text className={styles.revenueLabel}>教练费</Text>
            <Text className={`${styles.revenueAmount} ${styles.positive}`}>
              +{formatCurrency(stats.revenue.coachFees)}
            </Text>
          </View>
          <View className={styles.revenueRow}>
            <Text className={styles.revenueLabel}>加钟费</Text>
            <Text className={`${styles.revenueAmount} ${styles.positive}`}>
              +{formatCurrency(stats.revenue.extendFees)}
            </Text>
          </View>
          <View className={styles.revenueRow}>
            <Text className={styles.revenueLabel}>退款</Text>
            <Text className={`${styles.revenueAmount} ${styles.negative}`}>
              -{formatCurrency(stats.revenue.refunds)}
            </Text>
          </View>
          <View className={styles.revenueRow}>
            <Text className={styles.revenueLabel}>
              <Text style={{ fontWeight: 600 }}>今日实收</Text>
            </Text>
            <Text className={styles.revenueAmount} style={{ color: 'var(--color-primary)' }}>
              <Text style={{ fontWeight: 700 }}>{formatCurrency(stats.revenue.total)}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>教练排班</Text>
          <Text className={styles.sectionAction} onClick={() => handleJumpToCoach()}>
            全部教练 ›
          </Text>
        </View>
        <View className={styles.coachList}>
          {stats.coachStats.map((coach) => (
            <View
              key={coach.coachId}
              className={styles.coachItem}
              onClick={() => handleJumpToCoach(coach.coachId)}
            >
              <View className={styles.coachAvatar}>{coach.coachName.charAt(0)}</View>
              <View className={styles.coachInfo}>
                <Text className={styles.coachName}>{coach.coachName}</Text>
                <View className={styles.coachStats}>
                  <Text className={getRateClass(coach.rate)} style={{ fontWeight: 600 }}>
                    {coach.rate}%
                  </Text>
                  <Text style={{ marginLeft: 16 }}>
                    {Math.floor(coach.bookedMinutes / 60)}小时{coach.bookedMinutes % 60}分钟
                  </Text>
                </View>
              </View>
              <Text className={styles.arrow}>›</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>快速操作</Text>
        </View>
        <View className={styles.quickActions}>
          <View className={styles.quickAction} onClick={() => handleJumpToBooking()}>
            <View className={styles.quickActionIcon}>📅</View>
            <Text className={styles.quickActionLabel}>预约排期</Text>
          </View>
          <View className={styles.quickAction} onClick={() => handleJumpToQueue()}>
            <View className={styles.quickActionIcon}>📢</View>
            <Text className={styles.quickActionLabel}>排队叫号</Text>
          </View>
          <View className={styles.quickAction} onClick={() => handleJumpToCoach()}>
            <View className={styles.quickActionIcon}>🎾</View>
            <Text className={styles.quickActionLabel}>教练管理</Text>
          </View>
          <View className={styles.quickAction} onClick={() => handleJumpToMyBookings()}>
            <View className={styles.quickActionIcon}>📋</View>
            <Text className={styles.quickActionLabel}>预约记录</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>排队概览</Text>
          <Text className={styles.sectionAction} onClick={() => handleJumpToQueue()}>
            过号{totalNoShowCount}人 ›
          </Text>
        </View>
        <View className={styles.courtList}>
          {courts.map((court) => {
            const waiting = getCourtWaitingCount(court.id);
            const queue = courtQueues[court.id];
            const currentCalled = queue?.currentCalled;
            return (
              <View
                key={court.id}
                className={styles.courtItem}
                onClick={() => handleJumpToQueue(court.id)}
              >
                <View className={styles.courtInfo}>
                  <Text className={styles.courtName}>{court.name}</Text>
                  <View className={styles.courtStats}>
                    <Text>
                      {currentCalled ? (
                        <Text style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          叫号中: NO.{currentCalled.queueNumber}
                        </Text>
                      ) : (
                        <Text style={{ color: 'var(--color-text-tertiary)' }}>空闲中</Text>
                      )}
                    </Text>
                    <Text style={{ marginLeft: 24 }}>
                      等待 <Text style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{waiting}</Text> 人
                    </Text>
                  </View>
                </View>
                <Text className={styles.arrow}>›</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardPage;
