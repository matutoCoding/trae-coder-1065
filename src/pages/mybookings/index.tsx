import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Booking, Coach } from '@/types';
import { useBookingStore } from '@/store/booking';
import { coaches, getAvailableCoaches } from '@/data/coaches';
import { getMyBookings } from '@/data/bookings';
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

const MyBookingsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendHours, setExtendHours] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bookings = useBookingStore((s) => s.bookings);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);
  const addBooking = useBookingStore((s) => s.addBooking);

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
                    price: b.price + coachFee
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
    if (dayjs(`${booking.date} ${booking.endTime}`).hour() + 1 >= 22) {
      Taro.showToast({ title: '已达当天最晚结束时间(22:00)', icon: 'none' });
      return;
    }
    setExtendBooking(booking);
    setExtendHours(1);
    setShowExtendModal(true);
  };

  const getExtendOptions = (booking: Booking) => {
    const currentEndHour = dayjs(`2000-01-01 ${booking.endTime}`).hour();
    const maxHours = Math.min(22 - currentEndHour, 3);
    return Array.from({ length: maxHours }, (_, i) => ({
      hours: i + 1,
      price: getHourlyPrice(booking.courtId) * (i + 1)
    }));
  };

  const getHourlyPrice = (courtId: string): number => {
    const court = coaches.length > 0 ? [80, 80, 120, 150, 180, 180, 50, 120] : [];
    const idx = parseInt(courtId.replace('court_', ''), 10) - 1;
    return court[idx] || 80;
  };

  const handleConfirmExtend = () => {
    if (!extendBooking) return;

    const newStartTime = extendBooking.endTime;
    const endHour = dayjs(`2000-01-01 ${extendBooking.endTime}`).hour();
    const newEndTime = `${(endHour + extendHours).toString().padStart(2, '0')}:00`;
    const extendPrice = getHourlyPrice(extendBooking.courtId) * extendHours;

    Taro.showLoading({ title: '处理中...' });

    setTimeout(() => {
      const result = addBooking({
        courtId: extendBooking.courtId,
        courtName: extendBooking.courtName,
        date: extendBooking.date,
        startTime: newStartTime,
        endTime: newEndTime,
        userId: extendBooking.userId,
        userName: extendBooking.userName,
        userPhone: extendBooking.userPhone,
        price: extendPrice,
        status: 'confirmed',
        hasCoach: extendBooking.hasCoach,
        coachId: extendBooking.coachId,
        coachName: extendBooking.coachName
      });

      Taro.hideLoading();

      if (result.success) {
        Taro.showToast({ title: `加钟成功 +${extendHours}小时`, icon: 'success' });
        setShowExtendModal(false);
        setExtendBooking(null);
        console.log('[MyBookings] 加钟成功:', extendHours, '小时');
      } else {
        Taro.showModal({
          title: '加钟失败',
          content: result.message || '后续时段已被占用，请减少时长',
          showCancel: false
        });
      }
    }, 500);
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
              {booking.status === 'confirmed' && !booking.hasCoach && (
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
                <Text>{'\n'}</Text>
                <Text>请选择延长时长（最多延长到22:00）</Text>
              </View>
              <View className={styles.extendOptions}>
                {getExtendOptions(extendBooking).map((opt) => (
                  <View
                    key={opt.hours}
                    className={classnames(
                      styles.extendOption,
                      extendHours === opt.hours && styles.active
                    )}
                    onClick={() => setExtendHours(opt.hours)}
                  >
                    <Text className={styles.extendHours}>+{opt.hours}h</Text>
                    <Text className={styles.extendPrice}>¥{opt.price}</Text>
                  </View>
                ))}
              </View>
              <View
                className={classnames(styles.confirmBtn)}
                onClick={handleConfirmExtend}
              >
                <Text>确认加钟 ¥{getHourlyPrice(extendBooking.courtId) * extendHours}</Text>
              </View>
            </View>
            <View className={styles.modalFooter}>
              <Text>加钟期间如已预约教练，教练费用另行计算</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default MyBookingsPage;
