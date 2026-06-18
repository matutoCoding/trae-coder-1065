import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { QueueItem } from '@/types';
import PriorityBadge from '@/components/PriorityBadge';
import styles from './index.module.scss';

interface QueueItemCardProps {
  item: QueueItem;
  position?: number;
  onCall?: (id: string) => void;
  onMarkPlaying?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  onLeave?: (id: string) => void;
  onRestore?: (id: string) => void;
  onMarkNoShow?: (id: string) => void;
  showActions?: boolean;
}

const statusLabels: Record<QueueItem['status'], string> = {
  waiting: '等待中',
  called: '已叫号',
  playing: '上场中',
  completed: '已完成',
  left: '已离队',
  no_show: '已过号'
};

const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  position = 0,
  onCall,
  onMarkPlaying,
  onMarkCompleted,
  onLeave,
  onRestore,
  onMarkNoShow,
  showActions = true
}) => {
  const isAdmin = true;

  const getWaitTimeClass = (minutes: number): string => {
    if (minutes <= 5) return 'short';
    if (minutes > 30) return 'highlight';
    return 'ok';
  };

  const formatJoinTime = (timeStr: string): string => {
    return dayjs(timeStr).format('HH:mm') + ' 取号';
  };

  return (
    <View className={classnames(styles.item, styles[item.status])}>
      <View className={styles.header}>
        <View className={styles.numberRow}>
          <View>
            <View className={styles.numberPrefix}>
              <Text>NO.</Text>
            </View>
            <Text className={styles.queueNumber}>{item.queueNumber}</Text>
          </View>
          <View className={styles.userInfo}>
            <Text className={styles.userName}>{item.userName}</Text>
            <Text className={styles.joinTime}>{formatJoinTime(item.joinedAt)}</Text>
          </View>
        </View>
        <View className={classnames(styles.statusBadge, styles[item.status])}>
          <Text>{statusLabels[item.status]}</Text>
        </View>
      </View>

      <View className={styles.divider} />

      <View className={styles.infoRow}>
        <View className={styles.infoLeft}>
          <PriorityBadge priority={item.priority} label={item.priorityLabel} />
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>场地</Text>
            <Text>{item.courtName}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>人数</Text>
            <Text>{item.peopleCount}人</Text>
          </View>
        </View>
        {item.status === 'waiting' && (
          <View className={styles.waitTime}>
            <Text>预计等待</Text>
            <Text className={styles[getWaitTimeClass(item.estimatedWaitTime)]}>
              {item.estimatedWaitTime}
            </Text>
            <Text>分钟</Text>
          </View>
        )}
        {item.status === 'waiting' && position > 0 && (
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>排位</Text>
            <Text style={{ color: '$color-primary', fontWeight: 600 }}>第{position}位</Text>
          </View>
        )}
      </View>

      {showActions && isAdmin && (
        <View className={styles.footer}>
          {item.status === 'waiting' && (
            <>
              <View
                className={classnames(styles.btn, styles.warning)}
                onClick={() => onCall?.(item.id)}
              >
                <Text>立即叫号</Text>
              </View>
              <View
                className={classnames(styles.btn, styles.danger)}
                onClick={() => onLeave?.(item.id)}
              >
                <Text>离队</Text>
              </View>
            </>
          )}
          {item.status === 'called' && (
            <>
              <View
                className={classnames(styles.btn, styles.success)}
                onClick={() => onMarkPlaying?.(item.id)}
              >
                <Text>确认上场</Text>
              </View>
              <View
                className={classnames(styles.btn, styles.danger)}
                onClick={() => onLeave?.(item.id)}
              >
                <Text>离队</Text>
              </View>
            </>
          )}
          {item.status === 'playing' && (
            <View
              className={classnames(styles.btn, styles.primary)}
              onClick={() => onMarkCompleted?.(item.id)}
            >
              <Text>完成离场</Text>
            </View>
          )}
          {item.status === 'no_show' && (
            <View
              className={classnames(styles.btn, styles.success)}
              onClick={() => onRestore?.(item.id)}
            >
              <Text>恢复排队</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default QueueItemCard;
