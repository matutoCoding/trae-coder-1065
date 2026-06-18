import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';

interface VipPlan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  recommended?: boolean;
  features: string[];
}

const VIP_PLANS: VipPlan[] = [
  {
    id: 'month',
    name: '月度会员',
    price: 99,
    originalPrice: 199,
    duration: '30天',
    features: [
      '排队优先插队（VIP级）',
      '场地预约9折优惠',
      '每月2次免费教练1小时'
    ]
  },
  {
    id: 'quarter',
    name: '季度会员',
    price: 269,
    originalPrice: 597,
    duration: '90天',
    recommended: true,
    features: [
      '排队优先插队（VIP级）',
      '场地预约8折优惠',
      '每月6次免费教练1小时',
      '专属球场锁定优先权',
      '陪练教练9折优惠'
    ]
  },
  {
    id: 'year',
    name: '年度会员',
    price: 899,
    originalPrice: 2388,
    duration: '365天',
    features: [
      '排队优先插队（VIP级）',
      '场地预约7折优惠',
      '每月10次免费教练1小时',
      '专属球场锁定优先权',
      '陪练教练8折优惠',
      '免费使用更衣柜',
      '赛事活动优先报名'
    ]
  }
];

const PRIVILEGES = [
  { icon: '⚡', name: '优先插队', desc: 'VIP级别排队优先级' },
  { icon: '💰', name: '场地折扣', desc: '最高7折场地费优惠' },
  { icon: '🎾', name: '免费教练', desc: '每月赠送教练时长' },
  { icon: '🔒', name: '锁定优先', desc: '热门场地锁定优先权' },
  { icon: '🎁', name: '专属活动', desc: 'VIP专属赛事活动' },
  { icon: '👔', name: '更衣柜', desc: '免费专属储物柜' },
  { icon: '🏆', name: '赛事优先', desc: '赛事活动优先报名' },
  { icon: '📞', name: '专属客服', desc: '一对一VIP客服服务' }
];

const VipPage: React.FC = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('quarter');

  const selectedPlan = VIP_PLANS.find((p) => p.id === selectedPlanId);

  const handlePurchase = () => {
    if (!selectedPlan) return;

    Taro.showModal({
      title: '确认开通',
      content: `确定开通${selectedPlan.name}吗？\n费用：¥${selectedPlan.price}\n有效期：${selectedPlan.duration}`,
      confirmText: '确认支付',
      confirmColor: '#22c55e',
      success: (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '处理中...' });
          setTimeout(() => {
            Taro.hideLoading();
            Taro.showToast({ title: '开通成功', icon: 'success' });
            setTimeout(() => {
              Taro.navigateBack();
            }, 1500);
          }, 800);
        }
      }
    });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.topBanner}>
        <View className={styles.decoration} />
        <Text className={styles.crownIcon}>👑</Text>
        <Text className={styles.vipTitle}>开通网球VIP会员</Text>
        <Text className={styles.vipDesc}>
          享8大专属特权，排队优先、场地折扣、免费教练等超值权益
        </Text>
      </View>

      <View className={styles.contentSection}>
        <Text className={styles.plansSectionTitle}>选择会员套餐</Text>

        {VIP_PLANS.map((plan) => (
          <View
            key={plan.id}
            className={classnames(
              styles.planCard,
              plan.recommended && styles.recommended,
              selectedPlanId === plan.id && styles.selected
            )}
            onClick={() => setSelectedPlanId(plan.id)}
          >
            {plan.recommended && (
              <View className={styles.recommendBadge}>
                <Text>🔥 最划算</Text>
              </View>
            )}
            <View className={styles.planHeader}>
              <View>
                <Text className={styles.planName}>{plan.name}</Text>
                <Text style={{ fontSize: 24, color: '#86909c' }}>有效期：{plan.duration}</Text>
              </View>
              <View style={{ textAlign: 'right' }}>
                <View className={styles.planPrice}>
                  <Text style={{ fontSize: 24, color: '#ef4444' }}>¥</Text>
                  <Text className={styles.priceValue}>{plan.price}</Text>
                </View>
                <Text className={styles.planOriginal}>原价¥{plan.originalPrice}</Text>
              </View>
            </View>

            <View className={styles.planFeatures}>
              {plan.features.map((f, idx) => (
                <View key={idx} className={styles.featureItem}>
                  <Text className={styles.check}>✓</Text>
                  <Text>{f}</Text>
                </View>
              ))}
            </View>

            <View
              className={classnames(
                styles.selectBtn,
                selectedPlanId === plan.id && styles.primary
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlanId(plan.id);
              }}
            >
              <Text>{selectedPlanId === plan.id ? '✓ 已选择' : '选择此套餐'}</Text>
            </View>
          </View>
        ))}

        <View className={styles.privilegesSection}>
          <Text className={styles.privilegesTitle}>🎁 8大专属特权</Text>
          <View className={styles.privilegesGrid}>
            {PRIVILEGES.map((p, idx) => (
              <View key={idx} className={styles.privilegeCard}>
                <Text className={styles.privilegeIcon}>{p.icon}</Text>
                <Text className={styles.privilegeName}>{p.name}</Text>
                <Text className={styles.privilegeDesc}>{p.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.footer}>
        <View
          className={classnames(styles.payBtn, !selectedPlan && styles.disabled)}
          onClick={handlePurchase}
        >
          <Text>
            立即开通{selectedPlan ? ` · ¥${selectedPlan.price}` : ''}
          </Text>
        </View>
        <View className={styles.agreementText}>
          <Text>开通即表示同意</Text>
          <Text className={styles.agreementLink}> 《VIP会员服务协议》</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default VipPage;
