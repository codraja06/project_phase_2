import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { BORDER_RADIUS } from '../theme/radius';
import { SHADOWS } from '../theme/index';
import { SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';

export interface NotificationData {
  id: string;
  title: string;
  message?: string;
  timestamp: string;
  type?: 'status_change' | 'assignment' | 'alert' | 'system' | 'resolved' | 'in_progress' | 'received';
  isRead?: boolean;
  complaintId?: string;
}

interface NotificationItemProps {
  item: NotificationData;
  onPress?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ item, onPress }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';
  let iconColor = COLORS.secondary;
  let iconBg = COLORS.secondaryLight;

  const titleLower = item.title.toLowerCase();
  const msgLower = (item.message || '').toLowerCase();

  if (titleLower.includes('resolved') || msgLower.includes('resolved')) {
    iconName = 'checkmark-circle';
    iconColor = COLORS.resolved;
    iconBg = COLORS.resolvedLight;
  } else if (
    titleLower.includes('progress') ||
    msgLower.includes('progress') ||
    item.type === 'in_progress'
  ) {
    iconName = 'arrow-forward-circle';
    iconColor = COLORS.inProgress;
    iconBg = COLORS.inProgressLight;
  } else if (titleLower.includes('update') || item.type === 'alert') {
    iconName = 'notifications';
    iconColor = COLORS.pending;
    iconBg = COLORS.pendingLight;
  } else if (titleLower.includes('received') || titleLower.includes('submitted')) {
    iconName = 'document-text';
    iconColor = COLORS.primary;
    iconBg = COLORS.primaryLight;
  }

  const cardContent = (
    <>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.isRead === false && <View style={styles.unreadDot} />}
        </View>

        {item.message ? (
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}

        <Text style={styles.time}>{item.timestamp}</Text>
      </View>
    </>
  );

  const containerStyle = [
    styles.container,
    item.isRead === false && styles.containerUnread,
    isHovered && isWeb && (styles.containerHovered as any),
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        {...({
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        } as any)}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{cardContent}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.18s ease-in-out' as any,
    } : {}),
  },
  containerUnread: {
    borderColor: COLORS.primarySurface,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: '#FFF9F5',
  },
  containerHovered: {
    borderColor: COLORS.primary,
    ...SHADOWS.cardHover,
    transform: [{ translateY: -1.5 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.secondary,
    marginLeft: SPACING.sm,
    marginTop: 4,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  time: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
