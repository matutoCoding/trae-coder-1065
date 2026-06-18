import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Booking } from '@/types';
import styles from './index.module.scss';

interface BookingCardProps {
  booking: Booking;
  onCancel?: (bookingId: string) => void;
  onDetail?: (booking: Booking) => void;
  onAddCoach?: (booking: Booking) => void;
}

const statusLabels: Record<Booking['status'], string> = {
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

const formatDateLabel = (date: string): string => {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (date === today) return '今天';
  if (date === tomorrow) return '明天';
  return dayjs(date).format('MM月DD日');
};

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, onDetail, onAddCoach }) => {
  const isCancellable =
    booking.status === 'confirmed' &&
    dayjs(`${booking.date} ${booking.startTime}`).diff(dayjs(), 'hour') >= 2;

  const handleCancel = () => {
    if (!isCancellable) {
      Taro.showToast({ title: '预约开始前2小时内不可取消', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '确认取消',
      content: `确定要取消 ${booking.courtName} 的预约吗？`,
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          onCancel?.(booking.id);
        }
      }
    });
  };

  const handleAddCoach = () => {
    if (booking.hasCoach) return;
    onAddCoach?.(booking);
  };

  return (
    <View className={styles.card} onClick={() => onDetail?.(booking)}>
      <View className={styles.header}>
        <View className={styles.leftInfo}>
          <Text className={styles.courtName}>{booking.courtName}</Text>
          <View className={styles.tagsRow}>
            <View className={styles.tag}>
              <Text>{formatDateLabel(booking.date)}</Text>
            </View>
            <View className={styles.tag}>
              <Text>{booking.startTime}-{booking.endTime}</Text>
            </View>
            {booking.hasCoach && (
              <View className={styles.tag}>
                <Text>含陪练</Text>
              </View>
            )}
          </View>
        </View>
        <View className={classnames(styles.statusBadge, styles[booking.status])}>
          <Text>{statusLabels[booking.status]}</Text>
        </View>
      </View>

      {booking.hasCoach && booking.coachName && (
        <View className={styles.coachInfo}>
          <View className={styles.coachIcon}>
            <Text>教</Text>
          </View>
          <Text className={styles.coachText}>陪练教练：{booking.coachName}</Text>
        </View>
      )}

      <View className={styles.divider} />

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>预约日期</Text>
          <Text className={styles.infoValue}>{booking.date}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>使用时长</Text>
          <Text className={styles.infoValue}>
            {booking.totalDuration ||
              dayjs(`2000-01-01 ${booking.endTime}`).diff(
                dayjs(`2000-01-01 ${booking.startTime}`),
                'hour'
              )}
            小时
            {booking.isExtended && booking.extendedDuration && booking.extendedDuration > 0 && (
              <Text style={{ color: '#22c55e', fontSize: 24, marginLeft: 8 }}>
                (已加钟+{booking.extendedDuration}h)
              </Text>
            )}
          </Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>预约人</Text>
          <Text className={styles.infoValue}>{booking.userName}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>联系电话</Text>
          <Text className={styles.infoValue}>{booking.userPhone}</Text>
        </View>
      </View>

      {booking.isExtended && booking.extendPrice && booking.extendPrice > 0 && (
        <View className={styles.extendInfo}>
          <View className={styles.extendItem}>
            <Text className={styles.extendLabel}>原价</Text>
            <Text className={styles.extendValue}>¥{booking.originalPrice || booking.price - booking.extendPrice}</Text>
          </View>
          <View className={styles.extendItem}>
            <Text className={styles.extendLabel}>加钟费</Text>
            <Text className={styles.extendValue} style={{ color: '#22c55e' }}>+¥{booking.extendPrice}</Text>
          </View>
          <View className={styles.extendDivider} />
        </View>
      )}

      <View className={styles.footer}>
        <View className={styles.price}>
          <Text>¥{booking.price}</Text>
          <Text className={styles.priceUnit}>.00</Text>
          {booking.isExtended && booking.totalDuration && (
            <Text style={{ fontSize: 24, color: '#64748b', marginLeft: 12, fontWeight: 400 }}>
              共{booking.totalDuration}小时
            </Text>
          )}
        </View>
        <View className={styles.btnGroup} onClick={(e) => e.stopPropagation()}>
          {!booking.hasCoach && booking.status === 'confirmed' && (
            <View className={classnames(styles.btn, styles.primary)} onClick={handleAddCoach}>
              <Text>加教练</Text>
            </View>
          )}
          {booking.status === 'confirmed' && (
            <View
              className={classnames(styles.btn, isCancellable ? styles.danger : styles.disabled)}
              onClick={handleCancel}
            >
              <Text>取消预约</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default BookingCard;
