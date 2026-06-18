import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Coach } from '@/types';
import styles from './index.module.scss';

interface CoachCardProps {
  coach: Coach;
  onSelect?: (coach: Coach) => void;
}

const CoachCard: React.FC<CoachCardProps> = ({ coach, onSelect }) => {
  const handleSelect = () => {
    if (!coach.available) {
      Taro.showToast({ title: '该教练暂不可预约', icon: 'none' });
      return;
    }
    onSelect?.(coach);
  };

  return (
    <View className={styles.card}>
      {!coach.available && (
        <View className={styles.unavailableBadge}>
          <Text>暂不可约</Text>
        </View>
      )}
      <View className={styles.header}>
        <Image
          className={styles.avatar}
          src={coach.avatar}
          mode='aspectFill'
          onError={(e) => console.error('[CoachCard] 图片加载失败:', e)}
        />
        <View className={styles.info}>
          <View className={styles.nameRow}>
            <Text className={styles.name}>{coach.name}</Text>
            <View className={styles.levelBadge}>
              <Text>{coach.level}</Text>
            </View>
          </View>
          <View className={styles.metaRow}>
            <Text className={styles.rating}>★ {coach.rating}</Text>
            <Text className={styles.experience}>从业{coach.experience}年</Text>
          </View>
        </View>
      </View>

      <Text className={styles.description}>{coach.description}</Text>

      <View className={styles.specialtiesRow}>
        {coach.specialties.map((sp, idx) => (
          <View key={idx} className={styles.specialtyTag}>
            <Text>{sp}</Text>
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <View className={styles.price}>
          <Text>¥{coach.pricePerHour}</Text>
          <Text className={styles.priceUnit}>/小时</Text>
        </View>
        <View
          className={classnames(styles.btn, !coach.available && styles.disabled)}
          onClick={handleSelect}
        >
          <Text>{coach.available ? '预约教练' : '不可约'}</Text>
        </View>
      </View>
    </View>
  );
};

export default CoachCard;
