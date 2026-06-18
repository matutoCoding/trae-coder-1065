import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { TimeSlot } from '@/types';
import styles from './index.module.scss';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  bookedSlots: { startTime: string; endTime: string }[];
  selectedSlotIds: string[];
  pastSlotIds: string[];
  onSlotSelect: (slotId: string, selected: boolean) => void;
}

const getPeriodLabel = (startTime: string): string => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 6 && hour < 9) return '早场';
  if (hour >= 9 && hour < 12) return '上午';
  if (hour >= 12 && hour < 14) return '午间';
  if (hour >= 14 && hour < 18) return '下午';
  if (hour >= 18 && hour < 22) return '夜场';
  return '';
};

const isSlotBooked = (
  slot: TimeSlot,
  booked: { startTime: string; endTime: string }[]
): boolean => {
  return booked.some(
    (b) =>
      (slot.startTime >= b.startTime && slot.startTime < b.endTime) ||
      (slot.endTime > b.startTime && slot.endTime <= b.endTime) ||
      (slot.startTime <= b.startTime && slot.endTime >= b.endTime)
  );
};

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  bookedSlots,
  selectedSlotIds,
  pastSlotIds,
  onSlotSelect
}) => {
  const handleClick = (slot: TimeSlot, isBooked: boolean, isPast: boolean) => {
    if (isBooked || isPast) return;
    const isSelected = selectedSlotIds.includes(slot.id);
    onSlotSelect(slot.id, !isSelected);
  };

  const getConsecutiveCount = (slotId: string): number => {
    if (!selectedSlotIds.includes(slotId)) return 0;
    const sortedSelected = slots
      .filter((s) => selectedSlotIds.includes(s.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sortedSelected.length <= 1) return 0;

    const firstId = sortedSelected[0]?.id;
    if (slotId !== firstId) return 0;

    let consecutive = 1;
    for (let i = 1; i < sortedSelected.length; i++) {
      const prevEnd = sortedSelected[i - 1].endTime;
      const currStart = sortedSelected[i].startTime;
      if (prevEnd === currStart) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive >= 2 ? consecutive : 0;
  };

  return (
    <View className={styles.slotGrid}>
      {slots.map((slot) => {
        const booked = isSlotBooked(slot, bookedSlots);
        const past = pastSlotIds.includes(slot.id);
        const selected = selectedSlotIds.includes(slot.id);
        const consecutiveCount = getConsecutiveCount(slot.id);

        return (
          <View
            key={slot.id}
            className={classnames(
              styles.slotItem,
              !booked && !past && !selected && styles.available,
              selected && styles.selected,
              booked && !selected && styles.booked,
              past && !selected && !booked && styles.past
            )}
            onClick={() => handleClick(slot, booked, past)}
          >
            {consecutiveCount > 0 && (
              <View className={styles.consecutiveBadge}>连订{consecutiveCount}h</View>
            )}
            <View className={styles.timeLabel}>
              <Text>{slot.startTime}</Text>
            </View>
            <View className={styles.periodLabel}>
              <Text>{getPeriodLabel(slot.startTime)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default TimeSlotPicker;
