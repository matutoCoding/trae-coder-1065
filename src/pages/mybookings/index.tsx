import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Booking, Coach, FeeRecord, FeeRecordType } from '@/types';
import { useBookingStore } from '@/store/booking';
import { coaches, getAvailableCoaches } from '@/data/coaches';
import BookingCard from '@/components/BookingCard';
import CoachCard from '@/components/CoachCard';
import styles from './index.module.scss';

type BookingFilter = 'all' | 'confirmed' | 'completed' | 'cancelled';
type ViewMode = 'bookings' | 'bills';
type FeeFilter = 'all' | FeeRecordType;

const FILTER_TABS: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'confirmed', label: '已确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
];

const FEE_FILTER_TABS: { key: FeeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'booking', label: '场地费' },
  { key: 'add_coach', label: '教练费' },
  { key: 'extend', label: '加钟费' },
  { key: 'refund', label: '退款' }
];

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'bookings', label: '预约', icon: '📅' },
  { key: 'bills', label: '账单', icon: '📊' }
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
  const [viewMode, setViewMode] = useState<ViewMode>('bookings');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [extendHours, setExtendHours] = useState(1);
  const [extendCoach, setExtendCoach] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const bookings = useBookingStore((s) => s.bookings);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);
  const addBooking = useBookingStore((s) => s.addBooking);
  const checkConflict = useBookingStore((s) => s.checkConflict);
  const checkCoachAvailability = useBookingStore((s) => s.checkCoachAvailability);
  const extendBookingFn = useBookingStore((s) => s.extendBooking);
  const addCoachToBooking = useBookingStore((s) => s.addCoachToBooking);
  const getFeeRecordsByBooking = useBookingStore((s) => s.getFeeRecordsByBooking);
  const getMyFeeRecordsMonthly = useBookingStore((s) => s.getMyFeeRecordsMonthly);

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

  const monthlyBills = useMemo(() => {
    const filterType = feeFilter === 'all' ? undefined : feeFilter;
    return getMyFeeRecordsMonthly(filterType);
  }, [feeFilter, getMyFeeRecordsMonthly]);

  const billStats = useMemo(() => {
    let totalSpent = 0;
    let totalRefund = 0;
    let totalRecords = 0;

    monthlyBills.forEach((month) => {
      totalSpent += month.totalSpent;
      totalRefund += month.totalRefund;
      totalRecords += month.count;
    });

    return {
      totalSpent,
      totalRefund,
      netAmount: totalSpent - totalRefund,
      totalRecords
    };
  }, [monthlyBills]);

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

  const handleJumpToBookingFromRecord = (record: FeeRecord) => {
    const booking = bookings.find((b) => b.id === record.bookingId);
    if (booking) {
      handleDetail(booking);
    } else {
      Taro.showToast({ title: '预约记录不存在', icon: 'none' });
    }
  };

  const toggleFeeRecords = (bookingId: string) => {
    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  const toggleMonthRecords = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  const getFeeRecordTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      booking: '场地预订',
      add_coach: '添加教练',
      extend: '加钟',
      refund: '退款',
      cancel: '取消',
      discount: '优惠',
      other: '其他'
    };
    return labels[type] || type;
  };

  const getFeeRecordIcon = (type: string): string => {
    const icons: Record<string, string> = {
      booking: '🎾',
      add_coach: '👨‍🏫',
      extend: '⏰',
      refund: '↩️',
      cancel: '❌',
      discount: '🎁',
      other: '📝'
    };
    return icons[type] || '📝';
  };

  const getFeeRecordTagType = (type: FeeRecordType): string => {
    const types: Record<string, string> = {
      booking: 'court',
      add_coach: 'coach',
      extend: 'extend',
      refund: 'refund',
      cancel: 'refund'
    };
    return types[type] || 'default';
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
          const result = addCoachToBooking(
            currentBooking.id,
            selectedCoach.id,
            selectedCoach.name
          );
          if (result.success) {
            Taro.showToast({ title: '添加成功', icon: 'success' });
            setShowCoachModal(false);
            setCurrentBooking(null);
            setSelectedCoach(null);
            console.log('[MyBookings] 添加教练成功:', selectedCoach.name, '费用:', result.coachFee);
          } else {
            Taro.showToast({ title: result.message || '添加失败', icon: 'none' });
          }
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

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toFixed(0)}`;
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

        <View className={styles.viewModeTabs}>
          {VIEW_MODES.map((mode) => (
            <View
              key={mode.key}
              className={classnames(
                styles.viewModeTab,
                viewMode === mode.key && styles.viewModeActive
              )}
              onClick={() => setViewMode(mode.key)}
            >
              <Text>{mode.icon} {mode.label}</Text>
            </View>
          ))}
        </View>

        {viewMode === 'bookings' && (
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
        )}

        {viewMode === 'bills' && (
          <View className={styles.billStatsCard}>
            <View className={styles.billStatRow}>
              <View className={styles.billStatItem}>
                <Text className={styles.billStatLabel}>累计消费</Text>
                <Text className={styles.billStatValue}>{formatCurrency(billStats.totalSpent)}</Text>
              </View>
              <View className={styles.billStatItem}>
                <Text className={styles.billStatLabel}>累计退款</Text>
                <Text className={`${styles.billStatValue} ${styles.refundColor}`}>
                  -{formatCurrency(billStats.totalRefund)}
                </Text>
              </View>
            </View>
            <View className={styles.billStatNet}>
              <Text className={styles.billStatLabel}>净支出</Text>
              <Text className={styles.billStatNetValue}>
                {formatCurrency(billStats.netAmount)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {viewMode === 'bookings' && (
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
      )}

      {viewMode === 'bills' && (
        <View className={styles.filterTabs}>
          {FEE_FILTER_TABS.map((tab) => (
            <View
              key={tab.key}
              className={classnames(
                styles.filterTab,
                feeFilter === tab.key && styles.active
              )}
              onClick={() => setFeeFilter(tab.key)}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View className={styles.listSection}>
        {viewMode === 'bookings' && (
          <>
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
              filteredBookings.map((booking) => {
                const feeRecords = getFeeRecordsByBooking(booking.id);
                const isExpanded = expandedBookingId === booking.id;
                return (
                  <View key={booking.id}>
                    <BookingCard
                      booking={booking}
                      onCancel={handleCancel}
                      onDetail={handleDetail}
                      onAddCoach={handleAddCoach}
                    />
                    {feeRecords.length > 0 && (
                      <View className={styles.feeRecordsSection}>
                        <View
                          className={styles.feeRecordsHeader}
                          onClick={() => toggleFeeRecords(booking.id)}
                        >
                          <Text className={styles.feeRecordsTitle}>
                            💰 费用明细 ({feeRecords.length}条)
                          </Text>
                          <Text className={styles.feeRecordsToggle}>
                            {isExpanded ? '收起 ↑' : '展开 ↓'}
                          </Text>
                        </View>
                        {isExpanded && (
                          <View className={styles.feeRecordsList}>
                            {feeRecords.map((record) => (
                              <View
                                key={record.id}
                                className={styles.feeRecordItem}
                                onClick={() => handleJumpToBookingFromRecord(record)}
                              >
                                <View className={styles.feeRecordIcon}>
                                  {getFeeRecordIcon(record.type)}
                                </View>
                                <View className={styles.feeRecordInfo}>
                                  <Text className={styles.feeRecordTitle}>
                                    {getFeeRecordTypeLabel(record.type)}
                                  </Text>
                                  {record.description && (
                                    <Text className={styles.feeRecordDesc}>
                                      {record.description}
                                    </Text>
                                  )}
                                  <Text className={styles.feeRecordTime}>
                                    {dayjs(record.createdAt).format('MM-DD HH:mm')}
                                  </Text>
                                </View>
                                <View className={styles.feeRecordAmount}>
                                  <Text
                                    className={classnames(
                                      styles.feeAmount,
                                      record.amount >= 0 ? styles.feePositive : styles.feeNegative
                                    )}
                                  >
                                    {record.amount >= 0 ? '+' : '-'}¥{Math.abs(record.amount)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
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
                );
              })
            )}
          </>
        )}

        {viewMode === 'bills' && (
          <>
            {monthlyBills.length === 0 ? (
              <View className={styles.emptyState}>
                <View className={styles.emptyEmoji}>📊</View>
                <Text className={styles.emptyTitle}>暂无账单记录</Text>
                <Text className={styles.emptyDesc}>
                  {feeFilter !== 'all' ? '该分类下暂无消费记录' : '完成预约后将在此处生成账单'}
                </Text>
              </View>
            ) : (
              monthlyBills.map((monthBill) => {
                const isExpanded = expandedMonth === monthBill.month;
                return (
                  <View key={monthBill.month} className={styles.monthBillCard}>
                    <View
                      className={styles.monthBillHeader}
                      onClick={() => toggleMonthRecords(monthBill.month)}
                    >
                      <View className={styles.monthBillTitle}>
                        <Text className={styles.monthName}>{monthBill.monthLabel}</Text>
                        <Text className={styles.monthCount}>{monthBill.count}笔</Text>
                      </View>
                      <View className={styles.monthBillAmounts}>
                        <View className={styles.monthAmountRow}>
                          <Text className={styles.monthAmountLabel}>消费</Text>
                          <Text className={styles.monthAmountValue}>
                            +{formatCurrency(monthBill.totalSpent)}
                          </Text>
                        </View>
                        <View className={styles.monthAmountRow}>
                          <Text className={styles.monthAmountLabel}>退款</Text>
                          <Text className={`${styles.monthAmountValue} ${styles.refundColor}`}>
                            -{formatCurrency(monthBill.totalRefund)}
                          </Text>
                        </View>
                        <View className={styles.monthAmountRow}>
                          <Text className={styles.monthAmountLabel}>净支出</Text>
                          <Text className={styles.monthAmountNet}>
                            {formatCurrency(monthBill.netAmount)}
                          </Text>
                        </View>
                        <Text className={styles.expandIcon}>
                          {isExpanded ? '↑' : '↓'}
                        </Text>
                      </View>
                    </View>

                    {isExpanded && (
                      <View className={styles.monthBillRecords}>
                        {monthBill.records.map((record) => {
                          const booking = bookings.find((b) => b.id === record.bookingId);
                          return (
                            <View
                              key={record.id}
                              className={styles.billRecordItem}
                              onClick={() => handleJumpToBookingFromRecord(record)}
                            >
                              <View className={styles.billRecordLeft}>
                                <View className={styles.billRecordIcon}>
                                  {getFeeRecordIcon(record.type)}
                                </View>
                                <View className={styles.billRecordInfo}>
                                  <View className={styles.billRecordTitleRow}>
                                    <Text className={styles.billRecordTitle}>
                                      {getFeeRecordTypeLabel(record.type)}
                                    </Text>
                                    <View
                                      className={classnames(
                                        styles.billRecordTag,
                                        styles[`tag${getFeeRecordTagType(record.type)}`]
                                      )}
                                    >
                                      <Text>{getFeeRecordTypeLabel(record.type)}</Text>
                                    </View>
                                  </View>
                                  {record.description && (
                                    <Text className={styles.billRecordDesc}>
                                      {record.description}
                                    </Text>
                                  )}
                                  <View className={styles.billRecordMeta}>
                                    <Text className={styles.billRecordTime}>
                                      {dayjs(record.createdAt).format('MM-DD HH:mm')}
                                    </Text>
                                    {booking && (
                                      <Text className={styles.billRecordCourt}>
                                        · {booking.courtName}
                                      </Text>
                                    )}
                                    <Text className={styles.billRecordLink}>
                                      查看详情 ›
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <View className={styles.billRecordAmount}>
                                <Text
                                  className={classnames(
                                    styles.billAmount,
                                    record.amount >= 0 ? styles.billPositive : styles.billNegative
                                  )}
                                >
                                  {record.amount >= 0 ? '+' : '-'}¥{Math.abs(record.amount)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
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
