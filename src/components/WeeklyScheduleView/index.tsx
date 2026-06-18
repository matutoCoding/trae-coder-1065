import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useBookingStore } from '@/store/booking';
import { courts } from '@/data/courts';
import { generateTimeSlots, isTimeOverlap } from '@/utils/time';
import type { Court, Booking, TimeSlot } from '@/types';
import styles from './index.module.scss';

interface WeeklyScheduleViewProps {
  onSlotSelect?: (courtId: string, date: string, startTime: string, endTime: string) => void;
}

interface DaySlot {
  date: string;
  label: string;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
}

interface HourCellData {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'maintenance' | 'past';
  booking?: Booking;
  hasCoach?: boolean;
  coachName?: string;
}

const HOURS_TO_SHOW = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({ onSlotSelect }) => {
  const bookings = useBookingStore((s) => s.bookings);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedCourt, setExpandedCourt] = useState<string | null>(null);
  const [showFullHours, setShowFullHours] = useState(false);
  const allTimeSlots = useMemo(() => generateTimeSlots(), []);
  const activeCourts = useMemo(() => courts.filter((c) => c.status !== 'closed'), []);

  const displayTimeSlots = useMemo(() => {
    if (showFullHours) {
      return allTimeSlots;
    }
    return allTimeSlots.filter((slot) => HOURS_TO_SHOW.includes(slot.startTime));
  }, [showFullHours, allTimeSlots]);

  const weekDays = useMemo((): DaySlot[] => {
    const days: DaySlot[] = [];
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const startDate = dayjs().add(weekOffset * 7, 'day').startOf('day');

    for (let i = 0; i < 7; i++) {
      const date = startDate.add(i, 'day');
      days.push({
        date: date.format('YYYY-MM-DD'),
        label: i === 0 && weekOffset === 0 ? '今' : date.format('DD'),
        weekday: weekdays[date.day()],
        isToday: date.isSame(dayjs(), 'day'),
        isPast: date.isBefore(dayjs(), 'day')
      });
    }
    return days;
  }, [weekOffset]);

  const getCellStatus = useCallback((
    court: Court,
    day: DaySlot,
    slot: TimeSlot
  ): HourCellData => {
    const slotHour = parseInt(slot.startTime.split(':')[0], 10);
    const currentHour = dayjs().hour();
    const isPastSlot = day.isPast || (day.isToday && slotHour < currentHour);

    if (isPastSlot) {
      return {
        courtId: court.id,
        date: day.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'past'
      };
    }

    const isMaintenanceSlot = court.maintenanceSlots?.some((m) =>
      m.date === day.date && isTimeOverlap(slot.startTime, slot.endTime, m.startTime, m.endTime)
    );

    if (isMaintenanceSlot) {
      return {
        courtId: court.id,
        date: day.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'maintenance'
      };
    }

    const conflictBooking = bookings.find((b) =>
      b.courtId === court.id &&
      b.date === day.date &&
      b.status !== 'cancelled' &&
      isTimeOverlap(slot.startTime, slot.endTime, b.startTime, b.endTime)
    );

    if (conflictBooking) {
      return {
        courtId: court.id,
        date: day.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'booked',
        booking: conflictBooking,
        hasCoach: conflictBooking.hasCoach,
        coachName: conflictBooking.coachName
      };
    }

    return {
      courtId: court.id,
      date: day.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'available'
    };
  }, [bookings]);

  const handleCellClick = useCallback((cell: HourCellData) => {
    if (cell.status === 'past') {
      Taro.showToast({ title: '该时段已过期', icon: 'none' });
      return;
    }
    if (cell.status === 'maintenance') {
      Taro.showToast({ title: '场地维护中', icon: 'none' });
      return;
    }
    if (cell.status === 'booked') {
      const userName = cell.booking?.userName || '用户';
      const coachInfo = cell.hasCoach ? `（教练：${cell.coachName}）` : '';
      Taro.showToast({
        title: `已被 ${userName.charAt(0)}** 预约${coachInfo}`,
        icon: 'none',
        duration: 2000
      });
      return;
    }

    console.log('[WeeklySchedule] 点击空闲时段:', cell.courtId, cell.date, cell.startTime);
    onSlotSelect?.(cell.courtId, cell.date, cell.startTime, cell.endTime);
  }, [onSlotSelect]);

  const toggleCourtExpand = (courtId: string) => {
    setExpandedCourt((prev) => (prev === courtId ? null : courtId));
  };

  const handlePrevWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset(weekOffset - 1);
    }
  };

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.weekday}-${end.weekday}`;
  }, [weekDays]);

  const getCellStatusColor = (status: string): string => {
    switch (status) {
      case 'available': return 'available';
      case 'booked': return 'booked';
      case 'maintenance': return 'maintenance';
      case 'past': return 'past';
      default: return 'available';
    }
  };

  return (
    <View className={styles.weeklyContainer}>
      <View className={styles.weeklyHeader}>
        <View
          className={classnames(styles.weekNav, weekOffset === 0 && styles.disabled)}
          onClick={handlePrevWeek}
        >
          <Text>‹</Text>
        </View>
        <View className={styles.weekTitle}>
          <Text>第{weekOffset + 1}周</Text>
          <Text className={styles.weekSub}>{weekLabel}</Text>
        </View>
        <View className={styles.weekNav} onClick={handleNextWeek}>
          <Text>›</Text>
        </View>
      </View>

      <View className={styles.legendRow}>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.available)} />
          <Text>可预约</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.booked)} />
          <Text>已预约</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.maintenance)} />
          <Text>维护中</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.past)} />
          <Text>已过期</Text>
        </View>
      </View>

      <View className={styles.hourToggleRow}>
        <Text className={styles.hourToggleLabel}>时段密度</Text>
        <View
          className={classnames(styles.hourToggleBtn, !showFullHours && styles.active)}
          onClick={() => setShowFullHours(false)}
        >
          <Text>整点时段</Text>
        </View>
        <View
          className={classnames(styles.hourToggleBtn, showFullHours && styles.active)}
          onClick={() => setShowFullHours(true)}
        >
          <Text>全部时段</Text>
        </View>
      </View>

      <ScrollView scrollX enhanced showScrollbar={false} className={styles.weeklyScroll}>
        <View className={styles.weeklyTable}>
          <View className={styles.tableHeaderRow}>
            <View className={styles.cornerCell}>
              <Text className={styles.cornerText}>球场</Text>
            </View>
            {weekDays.map((day) => (
              <View
                key={day.date}
                className={classnames(
                  styles.dayHeader,
                  day.isToday && styles.today,
                  day.isPast && styles.past
                )}
              >
                <Text className={styles.dayWeekday}>{day.weekday}</Text>
                <Text className={styles.dayDate}>{day.label}</Text>
              </View>
            ))}
          </View>

          {activeCourts.map((court) => {
            const isExpanded = expandedCourt === court.id;
            return (
              <View key={court.id} className={styles.courtSection}>
                <View
                  className={classnames(styles.courtHeaderRow, isExpanded && styles.expanded)}
                  onClick={() => toggleCourtExpand(court.id)}
                >
                  <View className={styles.courtNameCell}>
                    <Text className={styles.courtName}>{court.name}</Text>
                    <Text className={styles.courtType}>{court.typeLabel}</Text>
                  </View>
                  {weekDays.map((day) => {
                    const dayBookings = bookings.filter(
                      (b) =>
                        b.courtId === court.id &&
                        b.date === day.date &&
                        b.status !== 'cancelled'
                    );
                    const bookedCount = dayBookings.length;
                    const ratio = bookedCount / displayTimeSlots.length;

                    return (
                      <View
                        key={day.date}
                        className={classnames(
                          styles.daySummaryCell,
                          day.isToday && styles.today,
                          day.isPast && styles.past
                        )}
                      >
                        {day.isPast ? (
                          <Text className={styles.pastText}>—</Text>
                        ) : (
                          <>
                            <View
                              className={classnames(
                                styles.occupancyBar,
                                ratio >= 0.8 ? styles.high : ratio >= 0.5 ? styles.medium : styles.low
                              )}
                              style={{ width: `${Math.min(100, ratio * 100)}%` }}
                            />
                            <Text className={styles.summaryCount}>
                              {bookedCount}/{displayTimeSlots.length}
                            </Text>
                          </>
                        )}
                      </View>
                    );
                  })}
                  <Text className={styles.expandIcon}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </View>

                {isExpanded && (
                  <ScrollView scrollX enhanced showScrollbar={false} className={styles.hoursScroll}>
                    <View className={styles.hoursContainer}>
                      <View className={styles.hourHeaderRow}>
                        <View className={styles.hourCornerCell} />
                        {displayTimeSlots.map((slot) => (
                          <View key={slot.id} className={styles.hourHeaderCell}>
                            <Text className={styles.hourText}>{slot.startTime}</Text>
                          </View>
                        ))}
                      </View>

                      {weekDays.map((day) => (
                        <View key={day.date} className={styles.hourRow}>
                          <View className={classnames(
                            styles.hourRowLabel,
                            day.isToday && styles.today,
                            day.isPast && styles.past
                          )}>
                            <Text className={styles.hourRowText}>{day.weekday}</Text>
                          </View>
                          {displayTimeSlots.map((slot) => {
                            const cell = getCellStatus(court, day, slot);
                            const colorClass = getCellStatusColor(cell.status);
                            return (
                              <View
                                key={`${day.date}-${slot.startTime}`}
                                className={classnames(
                                  styles.hourCell,
                                  styles[colorClass],
                                  day.isToday && styles.today
                                )}
                                onClick={() => handleCellClick(cell)}
                              >
                                {cell.status === 'booked' && (
                                  <>
                                    <Text className={styles.cellIcon}>
                                      {cell.hasCoach ? '👨‍🏫' : '●'}
                                    </Text>
                                    <Text className={styles.cellUser}>
                                      {cell.booking?.userName?.charAt(0)}**
                                    </Text>
                                  </>
                                )}
                                {cell.status === 'available' && (
                                  <Text className={styles.cellPrice}>
                                    ¥{court.pricePerHour}
                                  </Text>
                                )}
                                {cell.status === 'maintenance' && (
                                  <Text className={styles.cellIcon}>🔧</Text>
                                )}
                                {cell.status === 'past' && (
                                  <Text className={styles.cellPast}>—</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className={styles.weeklyTip}>
        <Text>💡 点击球场名称展开详情，点击空闲时段可直接预约</Text>
      </View>
    </View>
  );
};

export default WeeklyScheduleView;
