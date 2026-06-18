import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useBookingStore } from '@/store/booking';
import { courts } from '@/data/courts';
import { generateTimeSlots } from '@/utils/time';
import type { Court, Booking } from '@/types';
import styles from './index.module.scss';

interface WeeklyScheduleViewProps {
  onDateSelect?: (courtId: string, date: string, time?: string) => void;
}

interface DaySlot {
  date: string;
  label: string;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
}

interface CourtDayStatus {
  date: string;
  courtId: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  firstAvailable: string | null;
  bookings: Booking[];
}

const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({ onDateSelect }) => {
  const bookings = useBookingStore((s) => s.bookings);
  const [weekOffset, setWeekOffset] = useState(0);
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const activeCourts = useMemo(() => courts.filter((c) => c.status === 'available'), []);

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

  const courtDayStatus = useMemo((): Map<string, CourtDayStatus> => {
    const result = new Map<string, CourtDayStatus>();
    const now = dayjs();

    activeCourts.forEach((court) => {
      weekDays.forEach((day) => {
        const key = `${court.id}_${day.date}`;
        const dayBookings = bookings.filter(
          (b) =>
            b.courtId === court.id &&
            b.date === day.date &&
            b.status !== 'cancelled'
        );

        let bookedCount = 0;
        let firstAvailable: string | null = null;
        const currentHour = now.hour();

        timeSlots.forEach((slot, idx) => {
          const slotHour = parseInt(slot.startTime.split(':')[0], 10);
          const isPast = day.date === dayjs().format('YYYY-MM-DD') && slotHour < currentHour;

          if (isPast) {
            return;
          }

          const hasConflict = dayBookings.some((b) => {
            const bStart = parseInt(b.startTime.split(':')[0], 10);
            const bEnd = parseInt(b.endTime.split(':')[0], 10);
            const sStart = slotHour;
            const sEnd = slotHour + 1;
            return sStart < bEnd && sEnd > bStart;
          });

          if (hasConflict) {
            bookedCount++;
          } else if (!firstAvailable) {
            firstAvailable = slot.startTime;
          }
        });

        const totalAvailable = timeSlots.length -
          (day.date === dayjs().format('YYYY-MM-DD')
            ? Math.max(0, currentHour - 6)
            : 0);

        result.set(key, {
          date: day.date,
          courtId: court.id,
          totalSlots: timeSlots.length,
          bookedSlots: bookedCount,
          availableSlots: totalAvailable - bookedCount,
          firstAvailable,
          bookings: dayBookings
        });
      });
    });

    return result;
  }, [bookings, weekDays, activeCourts, timeSlots]);

  const handleDayClick = useCallback((court: Court, day: DaySlot) => {
    if (day.isPast) {
      Taro.showToast({ title: '不能选择过去的日期', icon: 'none' });
      return;
    }

    const key = `${court.id}_${day.date}`;
    const status = courtDayStatus.get(key);

    if (onDateSelect) {
      onDateSelect(court.id, day.date, status?.firstAvailable || undefined);
    }

    console.log('[WeeklySchedule] 点击:', court.name, day.date, '第一个空闲:', status?.firstAvailable);
  }, [onDateSelect, courtDayStatus]);

  const handlePrevWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset(weekOffset - 1);
    }
  };

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const getOccupancyColor = (status: CourtDayStatus, day: DaySlot): string => {
    if (day.isPast) return 'past';
    const ratio = status.totalSlots > 0 ? status.bookedSlots / status.totalSlots : 0;
    if (ratio >= 0.8) return 'busy';
    if (ratio >= 0.5) return 'moderate';
    return 'free';
  };

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.weekday}-${end.weekday}`;
  }, [weekDays]);

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
          <View className={classnames(styles.legendDot, styles.free)} />
          <Text>空闲</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.moderate)} />
          <Text>适中</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={classnames(styles.legendDot, styles.busy)} />
          <Text>繁忙</Text>
        </View>
      </View>

      <ScrollView scrollX enhanced showScrollbar={false} className={styles.weeklyScroll}>
        <View className={styles.weeklyGrid}>
          <View className={styles.courtColHeader}>
            <View className={styles.emptyCorner} />
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

          {activeCourts.map((court) => (
            <View key={court.id} className={styles.courtRow}>
              <View className={styles.courtNameCell}>
                <Text className={styles.courtName}>{court.name}</Text>
                <Text className={styles.courtType}>{court.typeLabel}</Text>
              </View>
              {weekDays.map((day) => {
                const key = `${court.id}_${day.date}`;
                const status = courtDayStatus.get(key);
                const occupancy = status ? getOccupancyColor(status, day) : 'free';

                return (
                  <View
                    key={key}
                    className={classnames(
                      styles.dayCell,
                      day.isToday && styles.today,
                      day.isPast && styles.past,
                      styles[occupancy]
                    )}
                    onClick={() => handleDayClick(court, day)}
                  >
                    {status && !day.isPast && (
                      <>
                        <Text className={styles.availableCount}>
                          {status.availableSlots}
                        </Text>
                        <Text className={styles.availableLabel}>个空时段</Text>
                        {status.firstAvailable && (
                          <Text className={styles.firstAvailable}>
                            最早 {status.firstAvailable}
                          </Text>
                        )}
                      </>
                    )}
                    {day.isPast && (
                      <Text className={styles.pastText}>已过期</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className={styles.weeklyTip}>
        <Text>💡 点击某天的球场可快速查看详情并预约</Text>
      </View>
    </View>
  );
};

export default WeeklyScheduleView;
