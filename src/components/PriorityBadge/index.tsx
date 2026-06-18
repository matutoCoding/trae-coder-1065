import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { PriorityLevel } from '@/types';
import styles from './index.module.scss';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  label?: string;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, label }) => {
  const defaultLabels: Record<PriorityLevel, string> = {
    vip: 'VIP',
    emergency: '应急',
    normal: '普通'
  };

  const displayLabel = label || defaultLabels[priority];

  return (
    <View className={classnames(styles.badge, styles[priority])}>
      <Text>{displayLabel}</Text>
    </View>
  );
};

export default PriorityBadge;
