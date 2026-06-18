import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Booking, Coach } from '@/types';
import { useBookingStore } from '@/store/booking';
import { coaches, getAvailableCoaches } from '@/data/coaches';
import BookingCard from '@/components/BookingCard';
import CoachCard from '@/components/CoachCard';
import styles from './index.module.scss';

type BookingFilter = 'all' | 'confirmed' | 'completed' | 'cancelled';

const FILTER_TABS: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
];

interface ExtendOption {
  hours: number;
  courtPrice: number;
  coachPrice: number;
  totalPrice: number;
  courtAvailable: boolean;
  coachAvailable: boolean;
  coachConflictMsg?: string;
  courtConflictMsg?: string;
}

const MyBookingsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendHours, setExtendHours] = useState(1);
  const [extendCoach, setExtendCoach] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bookings = useBookingStore((s) => s.bookings);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);
  const addBooking = useBookingStore((s) => s.addBooking);
  const checkConflict = useBookingStore((s) => s.checkConflict);
  const checkCoachAvailability = useBookingStore((s) => s.checkCoachAvailability);
  const extendBookingFn = useBookingStore((s) => s.extendBooking);

  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => b.userId === 'user_current')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings]);

  const stats = useMemo(() => {
    return {
      confirmed: myBookings.filter((b) => b.status === 'confirmed').length,
      completed: myBookings.filter((b) => b.status === 'completed').length,
      cancelled: myBookings.filter((b) => b.status === 'cancelled').length
    };
  }, [myBookings]);

  const filteredBookings = useMemo(() => {
    if (activeFilter === 'all') return myBookings;
    return myBookings.filter((b) => b.status === activeFilter);
  }, [myBookings, activeFilter]);

  const getHourlyPrice = useCallback((courtId: string): number => {
    const prices: Record<string, number> = {
      court_001: 80, court_002: 80, court_003: 120, court_004: 150,
      court_005: 180, court_006: 180, court_007: 50, court_008: 120
    };
    return prices[courtId] || 80;
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Taro.showToast({ title: '已更新', icon: 'none' });
    }, 800);
  };

  const handleCancel = (bookingId: string) => {
    const result = cancelBooking(bookingId);
    if (result.success) {
      Taro.showToast({ title: result.message || '取消成功', icon: 'success' });
      console.log('[MyBookings] 取消预约成功:', bookingId);
    } else {
      Taro.showToast({ title: result.message || '取消失败', icon: 'none' });
    }
  };

  const handleDetail = (booking: Booking) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${booking.id}`
    });
  };

  const handleAddCoach = (booking: Booking) => {
    if (booking.hasCoach) {
      Taro.showToast({ title: '该预约已预约教练', icon: 'none' });
      return;
    }
    setCurrentBooking(booking);
    setSelectedCoach(null);
    setShowCoachModal(true);
  };

  const handleSelectCoach = (coach: Coach) => {
    setSelectedCoach(coach);
  };

  const handleConfirmCoach = () => {
    if (!selectedCoach || !currentBooking) return;

    Taro.showModal({
      title: '确认添加',
      content: `确定为「${currentBooking.courtName}」预约「${selectedCoach.name}」吗？\n费用：¥${selectedCoach.pricePerHour}/小时`,
      confirmColor: '#22c55e',
      success: (res) => {
        if (res.confirm) {
          const duration = dayjs(`2000-01-01 ${currentBooking.endTime}`).diff(
            dayjs(`2000-01-01 ${currentBooking.startTime}`),
            'hour'
          );
          const coachFee = selectedCoach.pricePerHour * duration;

          useBookingStore.setState((state) => ({
            bookings: state.bookings.map((b) =>
              b.id === currentBooking.id
                ? {
                    ...b,
                    hasCoach: true,
                    coachId: selectedCoach.id,
                    coachName: selectedCoach.name,
                    coachPricePerHour: selectedCoach.pricePerHour,
                    price: b.price + coachFee,
                    originalPrice: (b.originalPrice || b.price) + coachFee
                  }
                : b
            )
          }));

          Taro.showToast({ title: '添加成功', icon: 'success' });
          setShowCoachModal(false);
          setCurrentBooking(null);
          setSelectedCoach(null);
          console.log('[MyBookings] 添加教练成功:', selectedCoach.name, '费用:', coachFee);
        }
      }
    });
  };

  const handleExtendTime = (booking: Booking) => {
    if (booking.status !== 'confirmed') {
      Taro.showToast({ title: '只能对已确认的预约加钟', icon: 'none' });
      return;
    }
    const bookingEnd = dayjs(`${booking.date} ${booking.endTime}`);
    if (bookingEnd.isBefore(dayjs())) {
      Taro.showToast({ title: '该预约已过期', icon: 'none' });
      return;
    }
    setExtendBooking(booking);
    setExtendHours(1);
    setExtendCoach(booking.hasCoach);
    setShowExtendModal(true);
  };

  const getExtendOptions = useCallback((booking: Booking): ExtendOption[] => {
    const currentEndHour = dayjs(`2000-01-01 ${booking.endTime}`).hour();
    const maxHours = Math.min(22 - currentEndHour, 3);
    const courtPricePerHour = booking.pricePerHour || getHourlyPrice(booking.courtId);
    const coachPricePerHour = booking.coachPricePerHour || 0;

    const options: ExtendOption[] = [];

    for (let i = 1; i <= maxHours; i++) {
      const newStartTime = booking.endTime;
      const endHour = currentEndHour + i;
      const newEndTime = `${endHour.toString().padStart(2, '0')}:00`;

      const courtCheck = checkConflict(
        booking.courtId,
        booking.date,
        newStartTime,
        newEndTime,
        booking.id
      );

      let coachCheck = { available: true, message: undefined };
      if (extendCoach && booking.hasCoach && booking.coachId) {
        coachCheck = checkCoachAvailability(
          booking.coachId,
          booking.date,
          newStartTime,
          newEndTime,
          booking.id
        );
      }

      options.push({
        hours: i,
        courtPrice: courtPricePerHour * i,
        coachPrice: extendCoach ? coachPricePerHour * i : 0,
        totalPrice: courtPricePerHour * i + (extendCoach ? coachPricePerHour * i : 0),
        courtAvailable: !courtCheck.hasConflict,
        coachAvailable: coachCheck.available,
        courtConflictMsg: courtCheck.message,
        coachConflictMsg: coachCheck.message
      });
    }

    return options;
  }, [extendCoach, checkConflict, checkCoachAvailability, getHourlyPrice]);

  const extendOptions = useMemo(() => {
    if (!extendBooking) return [];
    return getExtendOptions(extendBooking);
  }, [extendBooking, getExtendOptions]);

  const currentExtendOption = useMemo(() => {
    return extendOptions.find((o) => o.hours === extendHours);
  }, [extendOptions, extendHours]);

  const canExtend = useMemo(() => {
    if (!currentExtendOption) return false;
    return currentExtendOption.courtAvailable && currentExtendOption.coachAvailable;
  }, [currentExtendOption]);

  const handleConfirmExtend = () => {
    if (!extendBooking || !canExtend) return;

    Taro.showLoading({ title: '处理中...' });

    setTimeout(() => {
      const result = extendBookingFn(extendBooking.id, extendHours, extendCoach);

      Taro.hideLoading();

      if (result.success) {
        Taro.showToast({
          title: `加钟成功 +${extendHours}小时`,
          icon: 'success',
          duration: 2000
        });
        setShowExtendModal(false);
        setExtendBooking(null);
        console.log(
          '[MyBookings] 加钟成功:',
          extendHours,
          '小时, 场地费:',
          result.courtExtendPrice,
          '教练费:',
          result.coachExtendPrice,
          '总计:',
          result.totalExtendPrice
        );
      } else {
        Taro.showModal({
          title: '加钟失败',
          content: result.message || '无法加钟，请检查时段或减少时长',
          showCancel: false
        });
      }
    }, 500);
  };

  const getTotalDuration = (booking: Booking): number => {
    if (booking.totalDuration) return booking.totalDuration;
    return dayjs(`2000-01-01 ${booking.endTime}`).diff(
      dayjs(`2000-01-01 ${booking.startTime}`),
      'hour'
    );
  };

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      refreshing={isRefreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.topSection}>
        <Text className={styles.pageTitle}>📋 我的预约</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.confirmed}</Text>
            <Text className={styles.statLabel}>待使用</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.cancelled}</Text>
            <Text className={styles.statLabel}>已取消</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterTabs}>
        {FILTER_TABS.map((tab) => (
          <View
            key={tab.key}
            className={classnames(
              styles.filterTab,
              activeFilter === tab.key && styles.active
            )}
            onClick={() => setActiveFilter(tab.key)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.listSection}>
        {filteredBookings.length === 0 ? (
          <View className={styles.emptyState}>
            <View className={styles.emptyEmoji}>🎾</View>
            <Text className={styles.emptyTitle}>
              {activeFilter === 'all' ? '暂无预约记录' : '暂无相关预约'}
            </Text>
            <Text className={styles.emptyDesc}>
              去场地预约页面，选择心仪的球场开始打球吧
            </Text>
            <View
              className={styles.actionBtn}
              onClick={() => Taro.switchTab({ url: '/pages/booking/index' })}
            >
              <Text>去预约</Text>
            </View>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <View key={booking.id}>
              <BookingCard
                booking={booking}
                onCancel={handleCancel}
                onDetail={handleDetail}
                onAddCoach={handleAddCoach}
              />
              {booking.status === 'confirmed' && (
                <View className={styles.extendSection}>
                  <View className={styles.extendTitle}>
                    <Text>⏰ 快捷操作</Text>
                  </View>
                  <View
                    className={classnames(styles.confirmBtn, {})}
                    style={{ height: 80 }}
                    onClick={() => handleExtendTime(booking)}
                  >
                    <Text>➕ 延长使用时间（加钟）</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {showCoachModal && currentBooking && (
        <View className={styles.coachModalOverlay} onClick={() => setShowCoachModal(false)}>
          <View className={styles.coachModalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>选择陪练教练</Text>
              <View className={styles.closeBtn} onClick={() => setShowCoachModal(false)}>
                <Text>✕</Text>
              </View>
            </View>
            <View className={styles.modalBody}>
              <View className={styles.extendHint}>
                <Text>预约时段：{currentBooking.date} {currentBooking.startTime}-{currentBooking.endTime}</Text>
              </View>
              {getAvailableCoaches().map((coach) => (
                <View key={coach.id} onClick={() => handleSelectCoach(coach)}>
                  <CoachCard coach={coach} onSelect={handleSelectCoach} />
                </View>
              ))}
            </View>
            <View className={styles.modalFooter}>
              {selectedCoach ? (
                <View className={styles.confirmBtn} onClick={handleConfirmCoach}>
                  <Text>确认选择 {selectedCoach.name} - ¥{selectedCoach.pricePerHour}/小时</Text>
                </View>
              ) : (
                <Text>请选择一位教练</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {showExtendModal && extendBooking && (
        <View className={styles.coachModalOverlay} onClick={() => setShowExtendModal(false)}>
          <View className={styles.coachModalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>延长使用时间</Text>
              <View className={styles.closeBtn} onClick={() => setShowExtendModal(false)}>
                <Text>✕</Text>
              </View>
            </View>
            <View className={styles.modalBody}>
              <View className={styles.extendHint}>
                <Text>场地：{extendBooking.courtName}</Text>
                <Text>{'\n'}</Text>
                <Text>当前时段至：{extendBooking.endTime}</Text>
                {extendBooking.hasCoach && (
                  <>
                    <Text>{'\n'}</Text>
                    <Text>教练：{extendBooking.coachName} (¥{extendBooking.coachPricePerHour || 0}/小时)</Text>
                  </>
                )}
                <Text>{'\n'}</Text>
                <Text>当前总时长：{getTotalDuration(extendBooking)}小时 · 总费用：¥{extendBooking.price}</Text>
              </View>

              {extendBooking.hasCoach && (
                <View className={styles.extendCoachToggle}>
                  <View className={styles.extendCoachLabel}>
                    <Text>同时延长教练时间</Text>
                    <Text className={styles.extendCoachDesc}>教练将继续陪练</Text>
                  </View>
                  <Switch
                    checked={extendCoach}
                    color='#22c55e'
                    onChange={(e) => setExtendCoach(e.detail.value)}
                  />
                </View>
              )}

              <View className={styles.extendSectionTitle}>
                <Text>选择延长时长</Text>
              </View>
              <View className={styles.extendOptions}>
                {extendOptions.map((opt) => {
                  const isSelected = extendHours === opt.hours;
                  const isAvailable = opt.courtAvailable && opt.coachAvailable;
                  return (
                    <View
                      key={opt.hours}
                      className={classnames(
                        styles.extendOption,
                        isSelected && styles.active,
                        !isAvailable && styles.disabled
                      )}
                      onClick={() => isAvailable && setExtendHours(opt.hours)}
                    >
                      <Text className={styles.extendHours}>+{opt.hours}h</Text>
                      <Text className={styles.extendPrice}>¥{opt.totalPrice}</Text>
                      {!opt.courtAvailable && (
                        <Text className={styles.extendConflict}>场地已满</Text>
                      )}
                      {opt.courtAvailable && !opt.coachAvailable && (
                        <Text className={styles.extendConflict}>教练已满</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {currentExtendOption && (
                <View className={styles.extendBreakdown}>
                  <View className={styles.extendBreakdownTitle}>
                    <Text>费用明细</Text>
                  </View>
                  <View className={styles.extendBreakdownRow}>
                    <Text className={styles.extendBreakdownLabel}>场地费</Text>
                    <Text className={styles.extendBreakdownValue}>
                      ¥{currentExtendOption.courtPrice}
                      <Text className={styles.extendBreakdownUnit}>
                        ({extendBooking.pricePerHour || 80}元/小时 × {extendHours}h)
                      </Text>
                    </Text>
                  </View>
                  {extendCoach && extendBooking.hasCoach && (
                    <View className={styles.extendBreakdownRow}>
                      <Text className={styles.extendBreakdownLabel}>教练费</Text>
                      <Text className={styles.extendBreakdownValue}>
                        ¥{currentExtendOption.coachPrice}
                        <Text className={styles.extendBreakdownUnit}>
                          ({extendBooking.coachPricePerHour || 0}元/小时 × {extendHours}h)
                        </Text>
                      </Text>
                    </View>
                  )}
                  <View className={styles.extendBreakdownDivider} />
                  <View className={styles.extendBreakdownRow}>
                    <Text className={styles.extendBreakdownLabel}>加钟合计</Text>
                    <Text className={styles.extendBreakdownTotal}>
                      +¥{currentExtendOption.totalPrice}
                    </Text>
                  </View>
                  <View className={styles.extendBreakdownRow}>
                    <Text className={styles.extendBreakdownLabel}>加钟后总时长</Text>
                    <Text className={styles.extendBreakdownValue}>
                      {getTotalDuration(extendBooking) + extendHours}小时
                    </Text>
                  </View>
                  <View className={styles.extendBreakdownRow}>
                    <Text className={styles.extendBreakdownLabel}>加钟后总价</Text>
                    <Text className={styles.extendBreakdownValue}>
                      ¥{extendBooking.price + currentExtendOption.totalPrice}
                    </Text>
                  </View>
                </View>
              )}

              <View
                className={classnames(styles.confirmBtn, !canExtend && styles.disabled)}
                onClick={handleConfirmExtend}
              >
                <Text>
                  {canExtend
                    ? `确认加钟 +${extendHours}小时 · ¥${currentExtendOption?.totalPrice || 0}`
                    : '所选时段不可用'}
                </Text>
              </View>
            </View>
            <View className={styles.modalFooter}>
              <Text>加钟后将合并展示总时长和总价</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default MyBookingsPage;
