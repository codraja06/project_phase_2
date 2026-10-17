import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComplaintStatus } from '../types/complaint';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  style,
}) => {
  const normStatus = (status || '').toString().toLowerCase().trim();

  let bg = '#EDF2EF';
  let text = COLORS.textSecondary;
  let borderColor = COLORS.border;
  let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
  let label = status || 'Pending';

  if (normStatus === 'pending') {
    bg = COLORS.pendingLight;
    text = COLORS.pendingDark;
    borderColor = COLORS.pendingBorder;
    iconName = 'ellipse';
    label = 'Pending';
  } else if (normStatus === 'in progress' || normStatus === 'in_progress') {
    bg = COLORS.inProgressLight;
    text = COLORS.inProgressDark;
    borderColor = COLORS.inProgressBorder;
    iconName = 'ellipse';
    label = 'In Progress';
  } else if (normStatus === 'resolved') {
    bg = COLORS.resolvedLight;
    text = COLORS.resolvedDark;
    borderColor = COLORS.resolvedBorder;
    iconName = 'checkmark';
    label = 'Resolved';
  } else if (normStatus === 'rejected' || normStatus === 'cancelled') {
    bg = COLORS.rejectedLight;
    text = COLORS.rejectedDark;
    borderColor = COLORS.rejectedBorder;
    iconName = 'close';
    label = 'Rejected';
  } else if (normStatus === 'urgent' || normStatus === 'high') {
    bg = '#FEF2F2';
    text = '#DC2626';
    borderColor = '#FECACA';
    iconName = 'flame';
    label = 'Urgent';
  } else if (normStatus === 'verified') {
    bg = COLORS.successLight;
    text = COLORS.successDark;
    borderColor = COLORS.successBorder;
    iconName = 'shield-checkmark';
    label = 'Verified';
  }

  const iconSize = size === 'sm' ? (iconName === 'ellipse' ? 7 : 11) : size === 'lg' ? (iconName === 'ellipse' ? 10 : 15) : (iconName === 'ellipse' ? 8 : 13);

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        size === 'lg' && styles.badgeLg,
        { backgroundColor: bg, borderColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      {showIcon && (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
          { color: text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 11,
    fontWeight: '800',
  },
  textLg: {
    fontSize: 13,
    fontWeight: '800',
  },
});
