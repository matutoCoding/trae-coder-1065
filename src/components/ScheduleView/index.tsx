import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Court, ScheduleSlot, TimeSlot, Coach } from '@/types';
import { courts } from '@/data/courts';
import { coaches, getAvailableCoaches } from '@/data/coaches';
import { useBookingStore } from '@/store/booking';
import { generateTimeSlots, getCurrentTimeSlotIndex } from '@/utils/time';
import { isTimeOverlap } from '@/utils/time';
import styles from './index.module.scss';

interface ScheduleViewProps {
  selectedDate: string;
  onBookingSubmit?: (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string,
    totalPrice: number
  ) => void;
}

const LEGEND_ITEMS = [
  { key: 'available', label: '可预约' },
  { key: 'selected', label: '已选择' },
  { key: 'booked', label: '已占用' },
  { key: 'maintenance', label: '维护中' },
  { key: 'past', label: '已过期' }
];

const ScheduleView: React.FC<ScheduleViewProps> = ({ selectedDate, onBookingSubmit }) => {
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const bookings = useBookingStore((s) => s.bookings);
  const addBooking = useBookingStore((s) => s.addBooking);
  const checkCoachAvailability = useBookingStore((s) => s.checkCoachAvailability);

  const [selectedSlots, setSelectedSlots] = useState<Map<string, string[]>>(new Map());
  const [conflictMessage, setConflictMessage] = useState('');
  const [needCoach, setNeedCoach] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showCoachPicker, setShowCoachPicker] = useState(false);

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const availableCoaches = useMemo(() => getAvailableCoaches(), []);

  const scheduleData = useMemo(() => {
    const data: Map<string, ScheduleSlot[]> = new Map();

    const activeCourts = courts.filter((c) => c.status !== 'closed');

    activeCourts.forEach((court) => {
      const courtSlots: ScheduleSlot[] = [];
      const currentIdx = isToday ? getCurrentTimeSlotIndex(timeSlots) : -1;

      timeSlots.forEach((slot, idx) => {
        let status: ScheduleSlot['status'] = 'available';

        if (court.status === 'maintenance') {
          status = 'maintenance';
        } else if (isToday && idx < currentIdx) {
          status = 'past';
        } else {
          const conflictBooking = bookings.find(
            (b) =>
              b.courtId === court.id &&
              b.date === selectedDate &&
              b.status !== 'cancelled' &&
              isTimeOverlap(slot.startTime, slot.endTime, b.startTime, b.endTime)
          );

          if (conflictBooking) {
            status = 'booked';
            courtSlots.push({
              courtId: court.id,
              date: selectedDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: 'booked',
              bookingId: conflictBooking.id,
              bookingUserName: conflictBooking.userName,
              pricePerHour: court.pricePerHour,
              hasCoach: conflictBooking.hasCoach,
              coachName: conflictBooking.coachName,
              coachId: conflictBooking.coachId
            });
            return;
          }
        }

        courtSlots.push({
          courtId: court.id,
          date: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status,
          pricePerHour: court.pricePerHour
        });
      });

      data.set(court.id, courtSlots);
    });

    return data;
  }, [selectedDate, bookings, isToday, timeSlots]);

  const totalSelected = useMemo(() => {
    let count = 0;
    let courtPrice = 0;
    let coachPrice = 0;
    let courtId = '';
    let startTime = '';
    let endTime = '';
    const slotIds: string[] = [];

    selectedSlots.forEach((ids, cid) => {
      if (ids.length > 0) {
        count += ids.length;
        courtId = cid;
        const court = courts.find((c) => c.id === cid);
        courtPrice += ids.length * (court?.pricePerHour || 0);
        slotIds.push(...ids);

        const slots = scheduleData.get(cid);
        if (slots) {
          const selected = slots.filter((s) => ids.includes(`${s.startTime}-${s.endTime}`));
          if (selected.length > 0) {
            const sorted = [...selected].sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            );
            if (!startTime || sorted[0].startTime < startTime) {
              startTime = sorted[0].startTime;
            }
            if (!endTime || sorted[sorted.length - 1].endTime > endTime) {
              endTime = sorted[sorted.length - 1].endTime;
            }
          }
        }
      }
    });

    if (needCoach && selectedCoach && count > 0) {
      coachPrice = selectedCoach.pricePerHour * count;
    }

    const totalPrice = courtPrice + coachPrice;

    return { count, courtPrice, coachPrice, totalPrice, courtId, startTime, endTime, slotIds };
  }, [selectedSlots, scheduleData, needCoach, selectedCoach]);

  const checkConsecutive = useCallback(
    (courtId: string, slotIds: string[]) => {
      if (slotIds.length <= 1) return true;
      const slots = scheduleData.get(courtId);
      if (!slots) return false;

      const selected = slots
        .filter((s) => slotIds.includes(`${s.startTime}-${s.endTime}`))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 1; i < selected.length; i++) {
        if (selected[i].startTime !== selected[i - 1].endTime) {
          return false;
        }
      }
      return true;
    },
    [scheduleData]
  );

  const isSlotSelected = (courtId: string, slotKey: string) => {
    return selectedSlots.get(courtId)?.includes(slotKey) || false;
  };

  const handleSlotClick = (court: Court, slot: ScheduleSlot) => {
    if (slot.status === 'booked' || slot.status === 'maintenance' || slot.status === 'past') {
      if (slot.status === 'booked' && slot.bookingUserName) {
        Taro.showToast({
          title: `已被 ${slot.bookingUserName} 预约`,
          icon: 'none'
        });
      } else if (slot.status === 'maintenance') {
        Taro.showToast({ title: '场地维护中', icon: 'none' });
      }
      return;
    }

    const slotKey = `${slot.startTime}-${slot.endTime}`;
    const isSelected = isSlotSelected(court.id, slotKey);

    setSelectedSlots((prev) => {
      const newMap = new Map(prev);

      if (!isSelected) {
        const otherCourtSelected = Array.from(newMap.entries()).find(
          ([cid, ids]) => cid !== court.id && ids.length > 0
        );
        if (otherCourtSelected) {
          Taro.showToast({ title: '只能同时预约一个场地', icon: 'none' });
          return prev;
        }
      }

      const currentCourtSlots = newMap.get(court.id) || [];

      if (isSelected) {
        const filtered = currentCourtSlots.filter((id) => id !== slotKey);
        if (filtered.length > 0) {
          newMap.set(court.id, filtered);
        } else {
          newMap.delete(court.id);
        }
      } else {
        newMap.set(court.id, [...currentCourtSlots, slotKey]);
      }

      const allSelected = newMap.get(court.id) || [];
      if (allSelected.length > 0 && !checkConsecutive(court.id, allSelected)) {
        setConflictMessage('请选择连续的时段');
      } else {
        setConflictMessage('');
      }

      return newMap;
    });
  };

  const handleSubmit = () => {
    if (totalSelected.count === 0) return;
    if (conflictMessage) {
      Taro.showToast({ title: conflictMessage, icon: 'none' });
      return;
    }
    if (needCoach && !selectedCoach) {
      Taro.showToast({ title: '请选择教练', icon: 'none' });
      return;
    }

    Taro.showLoading({ title: '提交中...' });

    setTimeout(() => {
      const result = addBooking({
        courtId: totalSelected.courtId,
        courtName: courts.find((c) => c.id === totalSelected.courtId)?.name || '',
        date: selectedDate,
        startTime: totalSelected.startTime,
        endTime: totalSelected.endTime,
        userId: 'user_current',
        userName: '我',
        userPhone: '138****0001',
        price: totalSelected.totalPrice,
        status: 'confirmed',
        hasCoach: needCoach,
        coachId: selectedCoach?.id,
        coachName: selectedCoach?.name,
        coachPricePerHour: selectedCoach?.pricePerHour
      });

      Taro.hideLoading();

      if (result.success) {
        Taro.showToast({ title: '预约成功', icon: 'success' });
        setSelectedSlots(new Map());
        setConflictMessage('');
        setNeedCoach(false);
        setSelectedCoach(null);
        console.log('[ScheduleView] 预约成功:', result.booking?.id);
        onBookingSubmit?.(
          totalSelected.courtId,
          selectedDate,
          totalSelected.startTime,
          totalSelected.endTime,
          totalSelected.totalPrice
        );
      } else {
        Taro.showModal({
          title: '预约失败',
          content: result.message || '时段冲突，请重新选择',
          showCancel: false
        });
        console.log('[ScheduleView] 预约失败:', result.message);
      }
    }, 500);
  };

  const handleCoachSelect = (coach: Coach) => {
    if (totalSelected.count > 0) {
      const available = checkCoachAvailability(
        coach.id,
        selectedDate,
        totalSelected.startTime,
        totalSelected.endTime
      );
      if (!available.available) {
        Taro.showToast({
          title: `该教练此时段不可用：${available.message}`,
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    setSelectedCoach(coach);
    setShowCoachPicker(false);
    console.log('[ScheduleView] 选择教练:', coach.name);
  };

  const activeCourts = courts.filter((c) => c.status !== 'closed');

  return (
    <View>
      <View className={styles.legendRow}>
        {LEGEND_ITEMS.map((item) => (
          <View key={item.key} className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles[item.key])} />
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className={styles.scrollHint}>
        <Text>← 左右滑动查看更多时段 →</Text>
      </View>

      <View className={styles.scheduleContainer}>
        <View className={styles.scheduleHeader}>
          <View className={styles.cornerCell}>
            <Text>场地</Text>
          </View>
          <ScrollView
            className={styles.timeHeaderScroll}
            scrollX
            enhanced
            showScrollbar={false}
          >
            <View className={styles.timeHeaderRow}>
              {timeSlots.map((slot) => (
                <View key={slot.id} className={styles.timeHeaderCell}>
                  <Text>{slot.startTime}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView className={styles.scheduleBody} scrollY enhanced showScrollbar={false}>
          {activeCourts.map((court) => {
            const slots = scheduleData.get(court.id) || [];
            const courtSelected = selectedSlots.get(court.id) || [];

            return (
              <View key={court.id} className={styles.courtRow}>
                <View className={styles.courtNameCell}>
                  <Text className={styles.courtName}>{court.name}</Text>
                  <View className={styles.courtTypeTag}>
                    <Text>{court.typeLabel}</Text>
                  </View>
                </View>
                <ScrollView
                  className={styles.slotsScroll}
                  scrollX
                  enhanced
                  showScrollbar={false}
                >
                  <View className={styles.slotsRow}>
                    {slots.map((slot, idx) => {
                      const slotKey = `${slot.startTime}-${slot.endTime}`;
                      const selected = isSlotSelected(court.id, slotKey);
                      const isStart = selected && !isSlotSelected(court.id, `${slots[idx - 1]?.startTime}-${slots[idx - 1]?.endTime}`);
                      const isEnd = selected && !isSlotSelected(court.id, `${slots[idx + 1]?.startTime}-${slots[idx + 1]?.endTime}`);

                      return (
                        <View
                          key={slotKey}
                          className={classnames(
                            styles.slotCell,
                            styles[slot.status],
                            selected && styles.selected,
                            isStart && styles.consecutiveStart,
                            isEnd && styles.consecutiveEnd
                          )}
                          onClick={() => handleSlotClick(court, slot)}
                        >
                          <View className={styles.slotContent}>
                            {slot.status === 'booked' ? (
                              <>
                                <View className={styles.slotStatusIcon}>
                                  {slot.hasCoach ? '�‍🏫' : '�'}
                                </View>
                                <Text className={styles.bookedLabel}>
                                  {slot.bookingUserName?.charAt(0)}**
                                </Text>
                                {slot.hasCoach && (
                                  <Text className={styles.coachMiniLabel}>
                                    {slot.coachName?.charAt(0)}教
                                  </Text>
                                )}
                              </>
                            ) : slot.status === 'maintenance' ? (
                              <>
                                <View className={styles.slotStatusIcon}>🔧</View>
                                <Text className={styles.slotLabel}>维护</Text>
                              </>
                            ) : slot.status === 'past' ? (
                              <Text className={styles.slotLabel}>—</Text>
                            ) : (
                              <>
                                <View className={styles.slotStatusIcon}>
                                  {selected ? '✓' : '○'}
                                </View>
                                <Text className={styles.slotPrice}>¥{slot.pricePerHour}</Text>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {conflictMessage && (
        <View style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ef4444',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            <Text>!</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 24, color: '#ef4444', lineHeight: 1.5 }}>
            {conflictMessage}
          </Text>
        </View>
      )}

      {totalSelected.count > 0 && (
        <View className={styles.summaryBar}>
          <View className={styles.summaryInfo}>
            <Text className={styles.summaryText}>
              已选 <Text className={styles.summaryHighlight}>{totalSelected.count}小时</Text>
              {' · '}
              {courts.find((c) => c.id === totalSelected.courtId)?.name}
              {' '}
              {totalSelected.startTime}-{totalSelected.endTime}
            </Text>
          </View>

          <View className={styles.coachSection}>
            <View className={styles.coachSwitchRow}>
              <Text className={styles.coachLabel}>需要教练</Text>
              <Switch
                checked={needCoach}
                onChange={(e) => {
                  setNeedCoach(e.detail.value);
                  if (!e.detail.value) {
                    setSelectedCoach(null);
                  }
                }}
                color="#10b981"
              />
            </View>
            {needCoach && (
              <View className={styles.coachPickerRow}>
                {selectedCoach ? (
                  <View
                    className={styles.selectedCoachCard}
                    onClick={() => setShowCoachPicker(true)}
                  >
                    <View className={styles.coachAvatar}>{selectedCoach.name.charAt(0)}</View>
                    <View className={styles.coachInfo}>
                      <Text className={styles.coachName}>{selectedCoach.name}</Text>
                      <Text className={styles.coachPrice}>¥{selectedCoach.pricePerHour}/小时</Text>
                    </View>
                    <Text className={styles.changeCoach}>更换</Text>
                  </View>
                ) : (
                  <View
                    className={styles.selectCoachBtn}
                    onClick={() => setShowCoachPicker(true)}
                  >
                    <Text className={styles.selectCoachText}>选择教练</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View className={styles.priceBreakdown}>
            <View className={styles.priceRow}>
              <Text className={styles.priceLabel}>场地费</Text>
              <Text className={styles.priceValue}>¥{totalSelected.courtPrice}</Text>
            </View>
            {needCoach && selectedCoach && (
              <View className={styles.priceRow}>
                <Text className={styles.priceLabel}>教练费</Text>
                <Text className={styles.priceValue}>¥{totalSelected.coachPrice}</Text>
              </View>
            )}
            <View className={styles.priceRowTotal}>
              <Text className={styles.priceLabelTotal}>总计</Text>
              <Text className={styles.priceValueTotal}>¥{totalSelected.totalPrice}</Text>
            </View>
          </View>

          <View
            className={classnames(styles.bookBtn, (conflictMessage || (needCoach && !selectedCoach)) && styles.disabled)}
            onClick={handleSubmit}
          >
            <Text>确认预约</Text>
          </View>
        </View>
      )}

      {showCoachPicker && (
        <View className={styles.coachPickerModal} onClick={() => setShowCoachPicker(false)}>
          <View className={styles.coachPickerContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.coachPickerHeader}>
              <Text className={styles.coachPickerTitle}>选择教练</Text>
              <Text className={styles.coachPickerClose} onClick={() => setShowCoachPicker(false)}>
                关闭
              </Text>
            </View>
            <ScrollView className={styles.coachList} scrollY>
              {availableCoaches.map((coach) => {
                const coachAvailable =
                  totalSelected.count > 0
                    ? checkCoachAvailability(
                        coach.id,
                        selectedDate,
                        totalSelected.startTime,
                        totalSelected.endTime
                      ).available
                    : true;
                return (
                  <View
                    key={coach.id}
                    className={classnames(
                      styles.coachOption,
                      selectedCoach?.id === coach.id && styles.coachOptionSelected,
                      !coachAvailable && styles.coachOptionDisabled
                    )}
                    onClick={() => coachAvailable && handleCoachSelect(coach)}
                  >
                    <View className={styles.coachOptionAvatar}>{coach.name.charAt(0)}</View>
                    <View className={styles.coachOptionInfo}>
                      <Text className={styles.coachOptionName}>{coach.name}</Text>
                      <Text className={styles.coachOptionLevel}>{coach.level}</Text>
                    </View>
                    <View className={styles.coachOptionRight}>
                      <Text className={styles.coachOptionPrice}>¥{coach.pricePerHour}/小时</Text>
                      {!coachAvailable && (
                        <Text className={styles.coachOptionStatus}>时段不可用</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default ScheduleView;
