import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { COLORS } from '../theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Primitive pulsing skeleton box with loop animation.
 * Works seamlessly on iOS, Android, and Web without native driver issues.
 */
export const SkeletonBox: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * SkeletonCard — mimics complaint card layout.
 */
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonBox width={72} height={22} borderRadius={11} />
        <SkeletonBox width={80} height={14} borderRadius={4} />
      </View>
      <View style={styles.cardBody}>
        <SkeletonBox width="85%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonBox width="96%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonBox width="60%" height={14} borderRadius={4} />
      </View>
      <View style={styles.cardFooter}>
        <SkeletonBox width={110} height={14} borderRadius={4} />
        <SkeletonBox width={64} height={20} borderRadius={6} />
      </View>
    </View>
  );
};

/**
 * SkeletonStatCard — mimics authority KPI stat card.
 */
export const SkeletonStatCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.statCard, style]}>
      <SkeletonBox width={32} height={32} borderRadius={8} style={{ marginBottom: 10 }} />
      <SkeletonBox width={60} height={28} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonBox width="70%" height={12} borderRadius={4} />
    </View>
  );
};

/**
 * SkeletonList — multiple skeleton cards stacked.
 */
export const SkeletonList: React.FC<{ count?: number; style?: ViewStyle }> = ({
  count = 4,
  style,
}) => {
  return (
    <View style={[styles.listContainer, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: COLORS.borderLight || '#E2E8F0',
  },
  listContainer: {
    gap: 12,
    width: '100%',
  },
  card: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#E2E8F0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBody: {
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || '#F3ECE8',
  },
  statCard: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#E2E8F0',
    flex: 1,
    minWidth: 140,
  },
});
