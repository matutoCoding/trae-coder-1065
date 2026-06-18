import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Court, CourtType, TimeSlot } from '@/types';
import { courts, getAvailableCourts } from '@/data/courts';
import { useBookingStore } from '@/store/booking';
import {
  generateTimeSlots,
  getNextNDates,
  getCurrentTimeSlotIndex
} from '@/utils/time';
import { getBookedSlotsForCourt, isSlotBooked } from '@/utils/conflict';
import CourtCard from '@/components/CourtCard';
import TimeSlotPicker from '@/components/TimeSlot';
import ScheduleView from '@/components/ScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import styles from './index.module.scss';

type ViewMode = 'list' | 'schedule' | 'weekly';

const TYPE_FILTERS: { label: string; value: CourtType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '硬地', value: 'hard' },
  { label: '红土', value: 'clay' },
  { label: '草地', value: 'grass' },
  { label: '室内', value: 'indoor' }
];

const BookingPage: React.FC = () => {
  const dates = useMemo(() => getNextNDates(7), []);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const [selectedDate, setSelectedDate] = useState(dates[0].date);
  const [selectedType, setSelectedType] = useState<CourtType | 'all'>('all');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scheduleKey, setScheduleKey] = useState(0);

  const bookings = useBookingStore((s) => s.bookings);
  const addBooking = useBookingStore((s) => s.addBooking);
  const getCourtBookingsByDate = useBookingStore((s) => s.getCourtBookingsByDate);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);

  const myConfirmedBookings = useMemo(
    () =>
      useBookingStore
        .getState()
        .getMyBookings()
        .filter((b) => b.status === 'confirmed').length,
    [bookings]
  );

  const filteredCourts = useMemo(() => {
    let list = getAvailableCourts();
    if (selectedType !== 'all') {
      list = list.filter((c) => c.type === selectedType);
    }
    return list;
  }, [selectedType]);

  const bookedSlots = useMemo(() => {
    if (!selectedCourt) return [];
    const courtBookings = getCourtBookingsByDate(selectedCourt.id, selectedDate);
    return getBookedSlotsForCourt(selectedCourt.id, selectedDate, courtBookings);
  }, [selectedCourt, selectedDate, getCourtBookingsByDate, bookings]);

  const pastSlotIds = useMemo(() => {
    if (selectedDate !== dayjs().format('YYYY-MM-DD')) return [];
    const currentIdx = getCurrentTimeSlotIndex(timeSlots);
    return timeSlots.slice(0, currentIdx).map((s) => s.id);
  }, [selectedDate, timeSlots]);

  const selectedSlots = useMemo(() => {
    return timeSlots.filter((s) => selectedSlotIds.includes(s.id));
  }, [selectedSlotIds, timeSlots]);

  const totalPrice = useMemo(() => {
    if (!selectedCourt) return 0;
    return selectedSlots.length * selectedCourt.pricePerHour;
  }, [selectedCourt, selectedSlots]);

  useEffect(() => {
    if (selectedSlots.length > 1) {
      const sorted = [...selectedSlots].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      let hasGap = false;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime !== sorted[i - 1].endTime) {
          hasGap = true;
          break;
        }
      }
      if (hasGap) {
        setConflictMessage('请选择连续的时段');
      } else {
        setConflictMessage('');
      }
    } else {
      setConflictMessage('');
    }
  }, [selectedSlots]);

  useEffect(() => {
    try {
      const navParams = Taro.getStorageSync('navParams');
      if (navParams && navParams.from === 'dashboard') {
        console.log('[BookingPage] 收到导航参数:', navParams);
        if (navParams.date) {
          const targetDate = dates.find((d) => d.date === navParams.date);
          if (targetDate) {
            setSelectedDate(navParams.date);
          }
        }
        if (navParams.courtId) {
          const targetCourt = filteredCourts.find((c) => c.id === navParams.courtId);
          if (targetCourt) {
            setSelectedCourt(targetCourt);
            setShowBookingModal(true);
          }
        }
        Taro.removeStorageSync('navParams');
      }
    } catch (e) {
      console.error('[BookingPage] 读取导航参数失败:', e);
    }
  }, [dates, filteredCourts]);

  const handleSelectCourt = (court: Court) => {
    console.log('[BookingPage] 选择场地:', court.id, court.name);
    setSelectedCourt(court);
    setSelectedSlotIds([]);
    setConflictMessage('');
    setShowBookingModal(true);
  };

  const handleSlotSelect = (slotId: string, selected: boolean) => {
    const slot = timeSlots.find((s) => s.id === slotId);
    if (!slot) return;

    if (isSlotBooked(slot.startTime, slot.endTime, bookedSlots)) {
      Taro.showToast({ title: '该时段已被预约', icon: 'none' });
      return;
    }

    if (selected) {
      setSelectedSlotIds([...selectedSlotIds, slotId]);
    } else {
      setSelectedSlotIds(selectedSlotIds.filter((id) => id !== slotId));
    }
  };

  const handleSubmitBooking = () => {
    if (!selectedCourt || selectedSlots.length === 0) return;
    if (conflictMessage) {
      Taro.showToast({ title: conflictMessage, icon: 'none' });
      return;
    }

    const sortedSlots = [...selectedSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const startTime = sortedSlots[0].startTime;
    const endTime = sortedSlots[sortedSlots.length - 1].endTime;

    Taro.showLoading({ title: '提交中...' });

    setTimeout(() => {
      const result = addBooking({
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        date: selectedDate,
        startTime,
        endTime,
        userId: 'user_current',
        userName: '我',
        userPhone: '138****0001',
        price: totalPrice,
        status: 'confirmed',
        hasCoach: false
      });

      Taro.hideLoading();

      if (result.success) {
        Taro.showToast({ title: '预约成功', icon: 'success' });
        setShowBookingModal(false);
        setSelectedSlotIds([]);
        setSelectedCourt(null);
        setScheduleKey((k) => k + 1);
        console.log('[BookingPage] 预约成功:', result.booking?.id);
      } else {
        Taro.showModal({
          title: '预约失败',
          content: result.message || '时段冲突，请重新选择',
          showCancel: false
        });
        console.log('[BookingPage] 预约失败:', result.message);
      }
    }, 500);
  };

  const handleScheduleBooking = useCallback(
    (
      courtId: string,
      date: string,
      startTime: string,
      endTime: string,
      totalPrice: number
    ) => {
      console.log('[BookingPage] 排期视图预约成功:', courtId, startTime, endTime);
      setScheduleKey((k) => k + 1);
    },
    []
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setScheduleKey((k) => k + 1);
      Taro.showToast({ title: '已更新', icon: 'none' });
    }, 800);
  };

  const handleDateChange = (date: string) => {
    console.log('[BookingPage] 切换日期:', date);
    setSelectedDate(date);
    setSelectedSlotIds([]);
    setScheduleKey((k) => k + 1);
  };

  const handleWeeklySelect = useCallback((courtId: string, date: string, startTime?: string, endTime?: string) => {
    console.log('[BookingPage] 周视图选择:', courtId, date, startTime, endTime);
    setSelectedDate(date);
    setViewMode('schedule');
    setScheduleKey((k) => k + 1);

    const court = courts.find((c) => c.id === courtId);
    if (court) {
      setSelectedCourt(court);
    }

    if (startTime && endTime) {
      Taro.showModal({
        title: '快速预约',
        content: `已选择 ${court?.name || '球场'} ${date} ${startTime}-${endTime}，是否直接发起预约？`,
        confirmText: '立即预约',
        cancelText: '查看排期',
        success: (res) => {
          if (res.confirm) {
            setSelectedCourt(court || null);
            const slotId = `${date}_${startTime}-${endTime}`;
            const slot = timeSlots.find((s) => s.startTime === startTime);
            if (slot) {
              setSelectedSlotIds([slot.id]);
              setShowBookingModal(true);
            }
          } else {
            Taro.showToast({
              title: `已定位到 ${date} ${startTime}`,
              icon: 'none',
              duration: 1500
            });
          }
        }
      });
    } else {
      Taro.showToast({
        title: '已切换到排期视图',
        icon: 'none',
        duration: 1000
      });
    }
  }, [timeSlots]);

  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      refresherTriggered={isRefreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.topBanner}>
        <Text className={styles.bannerTitle}>🎾 网球中心</Text>
        <Text className={styles.bannerSubtitle}>专业场地，在线预约，畅打无忧</Text>
        <View className={styles.statsRow}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{courts.length}</Text>
            <Text className={styles.statLabel}>片场地</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{getAvailableCourts().length}</Text>
            <Text className={styles.statLabel}>可预约</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{myConfirmedBookings}</Text>
            <Text className={styles.statLabel}>我的预约</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterSection}>
        <View className={styles.filterCard}>
          <Text className={styles.filterLabel}>选择日期</Text>
          <ScrollView
            className={styles.dateScroll}
            scrollX
            enhanced
            showScrollbar={false}
          >
            <View className={styles.dateList}>
              {dates.map((d) => (
                <View
                  key={d.date}
                  className={classnames(
                    styles.dateItem,
                    selectedDate === d.date && styles.selected
                  )}
                  onClick={() => handleDateChange(d.date)}
                >
                  <Text className={styles.dateLabel}>{d.label}</Text>
                  <Text className={styles.dateWeekday}>{d.weekday}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View className={styles.viewToggle}>
            <View
              className={classnames(styles.viewTab, viewMode === 'list' && styles.active)}
              onClick={() => setViewMode('list')}
            >
              <Text>📋 列表</Text>
            </View>
            <View
              className={classnames(styles.viewTab, viewMode === 'schedule' && styles.active)}
              onClick={() => setViewMode('schedule')}
            >
              <Text>📅 日排期</Text>
            </View>
            <View
              className={classnames(styles.viewTab, viewMode === 'weekly' && styles.active)}
              onClick={() => setViewMode('weekly')}
            >
              <Text>📆 周视图</Text>
            </View>
          </View>

          {viewMode === 'list' && (
            <>
              <Text className={styles.filterLabel}>场地类型</Text>
              <View className={styles.typeTabs}>
                {TYPE_FILTERS.map((t) => (
                  <View
                    key={t.value}
                    className={classnames(
                      styles.typeTab,
                      selectedType === t.value && styles.active
                    )}
                    onClick={() => setSelectedType(t.value)}
                  >
                    <Text>{t.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      {viewMode === 'list' ? (
        <View className={styles.courtList}>
          <View className={styles.sectionTitle}>
            <Text className={styles.titleText}>可选场地</Text>
            <Text className={styles.countBadge}>共 {filteredCourts.length} 片</Text>
          </View>

          {filteredCourts.length === 0 ? (
            <View className={styles.emptyState}>
              <Text style={{ fontSize: '80rpx' }}>🎾</Text>
              <Text className={styles.emptyText}>暂无符合条件的场地</Text>
            </View>
          ) : (
            filteredCourts.map((court) => (
              <CourtCard key={court.id} court={court} onBook={handleSelectCourt} />
            ))
          )}
        </View>
      ) : viewMode === 'weekly' ? (
        <View className={styles.weeklySection}>
          <View className={styles.sectionTitle}>
            <Text className={styles.titleText}>周视图 · 快速预览</Text>
            <Text className={styles.countBadge}>点击某一天预约</Text>
          </View>
          <WeeklyScheduleView
            onSlotSelect={handleWeeklySelect}
          />
        </View>
      ) : (
        <View className={styles.scheduleSection}>
          <View className={styles.sectionTitle}>
            <Text className={styles.titleText}>排期视图 · {selectedDate}</Text>
            <Text className={styles.countBadge}>点击空闲时段发起预约</Text>
          </View>
          <ScheduleView
            key={`${selectedDate}-${scheduleKey}`}
            selectedDate={selectedDate}
            onBookingSubmit={handleScheduleBooking}
          />
        </View>
      )}

      {showBookingModal && selectedCourt && (
        <View className={styles.modalOverlay} onClick={() => setShowBookingModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>预约时段</Text>
              <View
                className={styles.closeBtn}
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedSlotIds([]);
                }}
              >
                <Text>✕</Text>
              </View>
            </View>

            <View className={styles.modalBody}>
              <View className={styles.selectedCourtInfo}>
                <Text className={styles.courtInfoName}>{selectedCourt.name}</Text>
                <Text className={styles.courtInfoMeta}>
                  {selectedCourt.typeLabel} · ¥{selectedCourt.pricePerHour}/小时 · {selectedDate}
                </Text>
              </View>

              <View className={styles.legendRow}>
                <View className={styles.legendItem}>
                  <View className={classnames(styles.legendDot, styles.available)} />
                  <Text>可选</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={classnames(styles.legendDot, styles.selected)} />
                  <Text>已选</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={classnames(styles.legendDot, styles.booked)} />
                  <Text>已约</Text>
                </View>
              </View>

              {conflictMessage && (
                <View className={styles.conflictAlert}>
                  <View className={styles.alertIcon}>
                    <Text>!</Text>
                  </View>
                  <Text className={styles.alertText}>{conflictMessage}</Text>
                </View>
              )}

              <Text className={styles.slotsSectionTitle}>选择时段（可连续多选）</Text>
              <TimeSlotPicker
                slots={timeSlots}
                bookedSlots={bookedSlots}
                selectedSlotIds={selectedSlotIds}
                pastSlotIds={pastSlotIds}
                onSlotSelect={handleSlotSelect}
              />
            </View>

            <View className={styles.modalFooter}>
              <View className={styles.summaryRow}>
                <View className={styles.summaryLeft}>
                  <Text>已选 </Text>
                  <Text className={styles.selectedSlotsText}>
                    {selectedSlots.length > 0
                      ? `${selectedSlots.length}小时 · ${
                          [...selectedSlots]
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
                            ?.startTime
                        }-${
                          [...selectedSlots]
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))[
                            selectedSlots.length - 1
                          ]?.endTime
                        }`
                      : '请选择时段'}
                  </Text>
                </View>
                <Text className={styles.totalPrice}>¥{totalPrice}</Text>
              </View>
              <View
                className={classnames(
                  styles.submitBtn,
                  selectedSlots.length === 0 && styles.disabled
                )}
                onClick={handleSubmitBooking}
              >
                <Text>确认预约</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default BookingPage;
