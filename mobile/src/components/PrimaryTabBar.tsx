import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { NotificationBadge } from './NotificationBadge';
import { useUnreadCount } from '../hooks/useUnreadCount';

const labels: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = {
  CitizenDashboard: { label: 'Home', icon: 'grid-outline', iconActive: 'grid' },
  ReportIssue: { label: 'Report', icon: 'camera-outline', iconActive: 'camera' },
  ComplaintHistory: { label: 'Complaints', icon: 'document-text-outline', iconActive: 'document-text' },
  CivicAssistant: { label: 'Assistance', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  CitizenMap: { label: 'Map', icon: 'map-outline', iconActive: 'map' },
  Notifications: { label: 'Alerts', icon: 'notifications-outline', iconActive: 'notifications' },
  CitizenProfile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  AuthorityDashboard: { label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  AllComplaints: { label: 'Complaints', icon: 'list-outline', iconActive: 'list' },
  AuthorityMap: { label: 'Map', icon: 'map-outline', iconActive: 'map' },
  AuthorityAnalytics: { label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  AuthorityNotifications: { label: 'Feed', icon: 'notifications-outline', iconActive: 'notifications' },
  AuthorityProfile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
};

export const PrimaryTabBar = ({ state, navigation, routes }: BottomTabBarProps & { routes: string[] }) => {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadCount();

  return (
    <View testID="primary-bottom-navigation" style={[styles.bar, { paddingBottom: Math.max(8, insets.bottom) }]}>
      {state.routes
        .filter(route => routes.includes(route.name))
        .map(route => {
          const active = state.routes[state.index].key === route.key;
          const conf = labels[route.name] || {
            label: route.name,
            icon: 'ellipse-outline' as const,
            iconActive: 'ellipse' as const,
          };
          const isNotificationRoute = route.name === 'Notifications' || route.name === 'AuthorityNotifications';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={conf.label}
              accessibilityState={{ selected: active }}
              style={styles.item}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <View style={[styles.iconContainer, active && { backgroundColor: COLORS.primaryLight, borderBottomWidth: 2, borderBottomColor: COLORS.gold }]}>
                <Ionicons
                  name={active ? conf.iconActive : conf.icon}
                  size={22}
                  color={active ? COLORS.primary : COLORS.textMuted}
                />
                {isNotificationRoute && unreadCount > 0 && (
                  <View style={styles.badgeWrapper}>
                    <NotificationBadge count={unreadCount} />
                  </View>
                )}
              </View>
              <Text style={[styles.label, active && { color: COLORS.primary, fontWeight: '700' }]}>
                {conf.label}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
    backgroundColor: COLORS.surface,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    minWidth: 42,
    minHeight: 30,
    borderRadius: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    position: 'absolute',
    top: -6,
    right: -10,
    zIndex: 10,
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
