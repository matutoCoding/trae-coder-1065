import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { FeeRecord } from '@/types';
import { useBookingStore } from '@/store/booking';
import styles from './index.module.scss';

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

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[status] || status;
};

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    confirmed: 'statusConfirmed',
    completed: 'statusCompleted',
    cancelled: 'statusCancelled'
  };
  return classes[status] || '';
};

const DetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params?.id || '';

  const booking = useBookingStore((s) => s.bookings.find((b) => b.id === bookingId));
  const getFeeRecordsByBooking = useBookingStore((s) => s.getFeeRecordsByBooking);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);

  const feeRecords = useMemo(() => {
    if (!bookingId) return [];
    return getFeeRecordsByBooking(bookingId);
  }, [bookingId, getFeeRecordsByBooking]);

  const feeStats = useMemo(() => {
    let totalPaid = 0;
    let totalRefund = 0;
    feeRecords.forEach((r) => {
      if (r.type === 'refund' || r.type === 'cancel') {
        totalRefund += Math.abs(r.amount);
      } else {
        totalPaid += r.amount;
      }
    });
    return {
      totalPaid,
      totalRefund,
      netAmount: totalPaid - totalRefund
    };
  }, [feeRecords]);

  const handleCancel = () => {
    if (!booking) return;
    Taro.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const result = cancelBooking(booking.id);
          Taro.showToast({
            title: result.success ? '取消成功' : (result.message || '取消失败'),
            icon: result.success ? 'success' : 'none'
          });
        }
      }
    });
  };

  if (!booking) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📋</Text>
          <Text className={styles.emptyTitle}>预约不存在</Text>
          <Text className={styles.emptyDesc}>该预约记录可能已被删除</Text>
        </View>
      </View>
    );
  }

  const getTotalDuration = (): number => {
    if (booking.totalDuration) return booking.totalDuration;
    return dayjs(`2000-01-01 ${booking.endTime}`).diff(
      dayjs(`2000-01-01 ${booking.startTime}`),
      'hour'
    );
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerInfo}>
          <Text className={styles.courtName}>{booking.courtName}</Text>
          <View className={classnames(styles.statusBadge, styles[getStatusClass(booking.status)])}>
            <Text>{getStatusLabel(booking.status)}</Text>
          </View>
        </View>
        <Text className={styles.bookingId}>订单号：{booking.id}</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>预约信息</Text>
        <View className={styles.infoCard}>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预约日期</Text>
            <Text className={styles.infoValue}>
              {dayjs(booking.date).format('YYYY年MM月DD日')}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>使用时段</Text>
            <Text className={styles.infoValue}>
              {booking.startTime} - {booking.endTime}
              <Text className={styles.durationText}>（{getTotalDuration()}小时）</Text>
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预约用户</Text>
            <Text className={styles.infoValue}>{booking.userName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>联系电话</Text>
            <Text className={styles.infoValue}>{booking.userPhone}</Text>
          </View>
          {booking.hasCoach && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>陪练教练</Text>
              <Text className={styles.infoValue}>
                👨‍🏫 {booking.coachName}
              </Text>
            </View>
          )}
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>下单时间</Text>
            <Text className={styles.infoValue}>
              {dayjs(booking.createdAt).format('YYYY-MM-DD HH:mm')}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>费用明细</Text>
        <View className={styles.feeSummaryCard}>
          <View className={styles.feeSummaryRow}>
            <Text className={styles.feeSummaryLabel}>已付金额</Text>
            <Text className={styles.feeSummaryPaid}>¥{feeStats.totalPaid}</Text>
          </View>
          <View className={styles.feeSummaryRow}>
            <Text className={styles.feeSummaryLabel}>退款金额</Text>
            <Text className={styles.feeSummaryRefund}>-¥{feeStats.totalRefund}</Text>
          </View>
          <View className={styles.feeSummaryDivider} />
          <View className={styles.feeSummaryRow}>
            <Text className={styles.feeSummaryLabel}>
              <Text style={{ fontWeight: 600 }}>实际支出</Text>
            </Text>
            <Text className={styles.feeSummaryNet}>¥{feeStats.netAmount}</Text>
          </View>
        </View>

        {feeRecords.length > 0 ? (
          <View className={styles.feeRecordsList}>
            {feeRecords.map((record) => (
              <View key={record.id} className={styles.feeRecordItem}>
                <View className={styles.feeRecordIcon}>
                  {getFeeRecordIcon(record.type)}
                </View>
                <View className={styles.feeRecordInfo}>
                  <Text className={styles.feeRecordTitle}>
                    {getFeeRecordTypeLabel(record.type)}
                  </Text>
                  {record.description && (
                    <Text className={styles.feeRecordDesc}>{record.description}</Text>
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
        ) : (
          <View className={styles.emptyFeeRecords}>
            <Text className={styles.emptyFeeText}>暂无费用记录</Text>
          </View>
        )}
      </View>

      {booking.status === 'confirmed' && (
        <View className={styles.actionSection}>
          <View className={styles.cancelBtn} onClick={handleCancel}>
            <Text>取消预约</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default DetailPage;
