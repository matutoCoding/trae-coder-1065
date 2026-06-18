import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { coaches, getAvailableCoaches } from '@/data/coaches';
import CoachCard from '@/components/CoachCard';
import type { Coach } from '@/types';
import styles from './index.module.scss';

const CoachPage: React.FC = () => {
  const availableCoaches = useMemo(() => getAvailableCoaches(), []);

  const handleSelect = (coach: Coach) => {
    Taro.showModal({
      title: `预约 ${coach.name}`,
      content: `${coach.level}\n从业${coach.experience}年\n价格：¥${coach.pricePerHour}/小时\n\n是否确认预约？`,
      confirmText: '确认预约',
      confirmColor: '#22c55e',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '预约成功', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <Text className={styles.sectionTitle}>陪练教练列表</Text>
      <View className={styles.list}>
        {availableCoaches.length === 0 ? (
          <View className={styles.placeholder}>
            <Text className={styles.icon}>🎾</Text>
            <Text className={styles.title}>暂无可预约教练</Text>
            <Text className={styles.desc}>
              请稍后再来查看，或联系前台获取帮助
            </Text>
          </View>
        ) : (
          availableCoaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} onSelect={handleSelect} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default CoachPage;
