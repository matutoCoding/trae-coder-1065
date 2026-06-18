import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Court } from '@/types';
import styles from './index.module.scss';

interface CourtCardProps {
  court: Court;
  onBook?: (court: Court) => void;
}

const CourtCard: React.FC<CourtCardProps> = ({ court, onBook }) => {
  const handleBook = () => {
    if (court.status !== 'available') {
      Taro.showToast({ title: '该场地暂不可预约', icon: 'none' });
      return;
    }
    onBook?.(court);
  };

  return (
    <View className={styles.card}>
      <View className={styles.header}>
        <Image
          className={styles.image}
          src={court.imageUrl}
          mode='aspectFill'
          onError={(e) => console.error('[CourtCard] 图片加载失败:', e)}
        />
        {court.status === 'maintenance' && (
          <View className={styles.maintenanceBadge}>维护中</View>
        )}
        <View className={styles.overlay}>
          <View className={styles.nameRow}>
            <Text className={styles.name}>{court.name}</Text>
            <View className={styles.priceBadge}>¥{court.pricePerHour}/小时</View>
          </View>
          <Text className={styles.typeLabel}>{court.typeLabel} · 容纳{court.capacity}人</Text>
        </View>
      </View>
      <View className={styles.content}>
        <Text className={styles.description}>{court.description}</Text>
        <View className={styles.tagsRow}>
          {court.tags.map((tag, idx) => (
            <View key={idx} className={styles.tag}>
              <Text>{tag}</Text>
            </View>
          ))}
        </View>
        <View className={styles.footer}>
          <View className={styles.infoRow}>
            <View className={styles.infoItem}>
              <Text>场地费</Text>
              <Text className={styles.infoValue}>¥{court.pricePerHour}/h</Text>
            </View>
            <View className={styles.infoItem}>
              <Text>人数</Text>
              <Text className={styles.infoValue}>{court.capacity}人</Text>
            </View>
          </View>
          <View
            className={classnames(styles.bookBtn, court.status !== 'available' && styles.disabled)}
            onClick={handleBook}
          >
            <Text>立即预约</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CourtCard;
