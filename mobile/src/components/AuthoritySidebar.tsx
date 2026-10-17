import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { CivicTrackLogo } from './CivicTrackLogo';
import { TYPOGRAPHY } from '../theme/typography';

interface NavItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const OPERATIONS_NAV: NavItem[] = [
  { label: 'Command Center', route: 'AuthorityDashboard', icon: 'grid-outline', iconActive: 'grid' },
  { label: 'All Complaints', route: 'AllComplaints', icon: 'list-outline', iconActive: 'list' },
  { label: 'Incident Map', route: 'AuthorityMap', icon: 'map-outline', iconActive: 'map' },
  { label: 'Operations Analytics', route: 'AuthorityAnalytics', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { label: 'Alerts & Feed', route: 'AuthorityNotifications', icon: 'notifications-outline', iconActive: 'notifications' },
];

const SETTINGS_NAV: NavItem[] = [
  { label: 'Profile & Settings', route: 'AuthorityProfile', icon: 'settings-outline', iconActive: 'settings' },
];

interface AuthoritySidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export const AuthoritySidebar: React.FC<AuthoritySidebarProps> = ({
  activeRoute,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  const renderNavItem = (item: NavItem) => {
    const isActive = activeRoute === item.route;
    const isHovered = hoveredRoute === item.route;

    return (
      <TouchableOpacity
        key={item.route}
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
          isHovered && !isActive && (styles.navItemHovered as any),
        ]}
        onPress={() => onNavigate(item.route)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
        {...({
          onMouseEnter: () => setHoveredRoute(item.route),
          onMouseLeave: () => setHoveredRoute(null),
        } as any)}
      >
        <Ionicons
          name={isActive ? item.iconActive : item.icon}
          size={18}
          color={isActive ? COLORS.primary : isHovered ? COLORS.textPrimary : COLORS.slateMuted}
          style={styles.navIcon}
        />
        <Text
          style={[
            styles.navLabel,
            isActive && styles.navLabelActive,
            isHovered && !isActive && styles.navLabelHovered,
          ]}
        >
          {item.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.logoArea}>
        <View style={styles.logoRow}>
          <CivicTrackLogo size="sm" showText={true} showTagline={false} />
        </View>
        <View style={styles.portalTag}>
          <Text style={styles.portalTagText}>MUNICIPAL OPERATIONS</Text>
        </View>
      </View>

      {/* Navigation Links */}
      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navContent}
      >
        <Text style={styles.navSectionHeader}>OPERATIONS</Text>
        {OPERATIONS_NAV.map(renderNavItem)}

        <View style={styles.sectionDivider} />

        <Text style={styles.navSectionHeader}>SETTINGS</Text>
        {SETTINGS_NAV.map(renderNavItem)}
      </ScrollView>

      {/* Footer Info Card */}
      <View style={styles.footer}>
        <View style={styles.footerOfficerCard}>
          <View style={styles.officerAvatar}>
            <Text style={styles.officerAvatarText}>
              {(user?.name || 'Officer').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'OF'}
            </Text>
          </View>
          <View style={styles.officerInfo}>
            <Text style={styles.officerName}>{user?.name || 'Officer'}</Text>
            <View style={styles.officerBadgeRow}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.secondary} />
              <Text style={styles.officerRole}>Authorized Officer</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    maxWidth: '100%',
    backgroundColor: COLORS.background,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    flexDirection: 'column',
  },
  logoArea: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  logoRow: {
    marginBottom: 8,
    alignItems: 'center',
  },
  portalTag: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  portalTagText: {
    ...TYPOGRAPHY.overline,
    color: COLORS.surface,
    letterSpacing: 0.5,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  navSectionHeader: {
    ...TYPOGRAPHY.overline,
    color: COLORS.slateMuted,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 4,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease' as any,
    } : {}),
  },
  navItemActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  navItemHovered: {
    backgroundColor: '#EDF2EF',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  navIcon: {
    marginRight: 12,
  },
  navLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  navLabelActive: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  navLabelHovered: {
    color: COLORS.textPrimary,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerOfficerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  officerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officerAvatarText: {
    ...TYPOGRAPHY.badge,
    color: COLORS.primaryDark,
  },
  officerInfo: {
    flex: 1,
  },
  officerName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  officerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officerRole: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
  },
});
