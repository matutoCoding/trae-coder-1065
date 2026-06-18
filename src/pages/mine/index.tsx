import React, { useMemo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { useBookingStore } from '@/store/booking';
import { coaches } from '@/data/coaches';
import styles from './index.module.scss';

const userData = {
  id: 'user_current',
  name: '网球爱好者',
  phone: '138****0001',
  avatar: 'https://picsum.photos/id/64/200/200',
  isVip: false,
  vipLevel: 0,
  vipExpireDate: undefined
};

const MinePage: React.FC = () => {
  const bookings = useBookingStore((s) => s.bookings);

  const stats = useMemo(() => {
    const myBookings = bookings.filter((b) => b.userId === 'user_current');
    const totalHours = myBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((acc, b) => {
        const duration = dayjs(`2000-01-01 ${b.endTime}`).diff(
          dayjs(`2000-01-01 ${b.startTime}`),
          'hour'
        );
        return acc + duration;
      }, 0);
    const totalSpent = myBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((acc, b) => acc + b.price, 0);

    return {
      totalBookings: myBookings.filter((b) => b.status !== 'cancelled').length,
      totalHours,
      totalSpent
    };
  }, [bookings]);

  const handleGoBookings = () => {
    Taro.switchTab({ url: '/pages/mybookings/index' });
  };

  const handleGoCoach = () => {
    Taro.navigateTo({ url: '/pages/coach/index' });
  };

  const handleGoVip = () => {
    Taro.navigateTo({ url: '/pages/vip/index' });
  };

  const handleEditProfile = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' });
  };

  const handleQueueHistory = () => {
    Taro.switchTab({ url: '/pages/queue/index' });
  };

  const handleCourtIntro = () => {
    Taro.showToast({ title: '场地介绍开发中', icon: 'none' });
  };

  const handleSettings = () => {
    Taro.showToast({ title: '设置开发中', icon: 'none' });
  };

  const handleAbout = () => {
    Taro.showModal({
      title: '关于网球中心',
      content: '专业网球场地预约系统\n版本 v1.0.0\n\n提供场地预约、排队叫号、VIP优先等服务',
      showCancel: false,
      confirmText: '知道了'
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.profileHeader}>
        <View className={styles.bgDecoration} />
        <View className={styles.profileRow}>
          <Image
            className={styles.avatar}
            src={userData.avatar}
            mode='aspectFill'
            onClick={handleEditProfile}
          />
          <View className={styles.userInfo}>
            <View className={styles.nameRow}>
              <Text className={styles.userName}>{userData.name}</Text>
              {userData.isVip && (
                <View className={styles.vipBadge}>
                  <Text>👑 VIP{userData.vipLevel}</Text>
                </View>
              )}
            </View>
            <Text className={styles.userPhone}>{userData.phone}</Text>
            <Text className={styles.vipInfo}>
              {userData.isVip
                ? `有效期至 ${userData.vipExpireDate}`
                : '开通VIP享受优先插队等特权'}
            </Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.totalBookings}</Text>
            <Text className={styles.statLabel}>累计预约</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.totalHours}h</Text>
            <Text className={styles.statLabel}>打球时长</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>¥{stats.totalSpent}</Text>
            <Text className={styles.statLabel}>累计消费</Text>
          </View>
        </View>
      </View>

      <View className={styles.floatingCards}>
        {!userData.isVip && (
          <View className={styles.vipCard}>
            <View className={styles.vipCardBg}>👑</View>
            <Text className={styles.vipCardLabel}>VIP MEMBER</Text>
            <Text className={styles.vipCardTitle}>开通网球VIP会员</Text>
            <Text className={styles.vipCardDesc}>
              享排队优先插队、预约免押金、专属球场折扣等8大特权
            </Text>
            <View className={styles.vipCardBtn} onClick={handleGoVip}>
              <Text>立即开通 →</Text>
            </View>
          </View>
        )}

        <View className={styles.coachCard} onClick={handleGoCoach}>
          <View className={styles.coachIcon}>
            <Text>🎾</Text>
          </View>
          <View className={styles.coachInfo}>
            <Text className={styles.coachTitle}>专业陪练教练</Text>
            <Text className={styles.coachDesc}>
              {coaches.filter((c) => c.available).length}位教练在线 · 国家级、省队级专业指导
            </Text>
          </View>
          <View className={styles.coachBtn} onClick={(e) => { e.stopPropagation(); handleGoCoach(); }}>
            <Text>去预约</Text>
          </View>
        </View>
      </View>

      <View className={styles.menuSection}>
        <Text className={styles.sectionTitle}>常用功能</Text>
        <View className={styles.menuGroup}>
          <View className={styles.menuItem} onClick={handleGoBookings}>
            <View className={styles.menuIcon}>
              <Text>📋</Text>
            </View>
            <Text className={styles.menuText}>我的预约</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.menuItem} onClick={handleQueueHistory}>
            <View className={`${styles.menuIcon} ${styles.orange}`}>
              <Text>📢</Text>
            </View>
            <Text className={styles.menuText}>排队叫号</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.menuItem} onClick={handleGoCoach}>
            <View className={`${styles.menuIcon} ${styles.blue}`}>
              <Text>🏋️</Text>
            </View>
            <Text className={styles.menuText}>陪练教练</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>

        <Text className={styles.sectionTitle}>更多服务</Text>
        <View className={styles.menuGroup}>
          <View className={styles.menuItem} onClick={handleGoVip}>
            <View className={`${styles.menuIcon} ${styles.purple}`}>
              <Text>👑</Text>
            </View>
            <Text className={styles.menuText}>VIP会员中心</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.menuItem} onClick={handleCourtIntro}>
            <View className={`${styles.menuIcon} ${styles.green}`}>
              <Text>🏟️</Text>
            </View>
            <Text className={styles.menuText}>场地介绍</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.menuItem} onClick={handleSettings}>
            <View className={`${styles.menuIcon} ${styles.gray}`}>
              <Text>⚙️</Text>
            </View>
            <Text className={styles.menuText}>设置</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.divider} />
          <View className={styles.menuItem} onClick={handleAbout}>
            <View className={`${styles.menuIcon} ${styles.blue}`}>
              <Text>ℹ️</Text>
            </View>
            <Text className={styles.menuText}>关于我们</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>

        <Text className={styles.versionText}>网球中心预约 v1.0.0</Text>
      </View>
    </View>
  );
};

export default MinePage;
