import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface NotificationBadgeProps {
  count: number;
  /** If true, shows just a red dot without a count (for very small spaces) */
  dot?: boolean;
  /** Override background color */
  color?: string;
}

/**
 * NotificationBadge — Red indicator for unread notification counts.
 * Used in sidebar nav items and bottom tab icons.
 *
 * - count 0 → renders nothing
 * - count 1–9 → shows number
 * - count 10+ → shows "9+"
 * - dot mode → always shows a small dot regardless of count
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  dot = false,
  color = COLORS.error,
}) => {
  if (count <= 0 && !dot) return null;

  if (dot) {
    return (
      <View
        accessibilityLabel="New notifications"
        style={[styles.dot, { backgroundColor: color }]}
      />
    );
  }

  const label = count > 9 ? '9+' : String(count);
  const isWide = label.length > 1;

  return (
    <View
      accessibilityLabel={`${count} unread notification${count === 1 ? '' : 's'}`}
      style={[
        styles.badge,
        isWide && styles.badgeWide,
        { backgroundColor: color },
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeWide: {
    minWidth: 22,
    paddingHorizontal: 5,
    borderRadius: 9,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
