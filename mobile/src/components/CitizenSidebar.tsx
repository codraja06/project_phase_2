import React, { useState } from 'react';
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

interface NavItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const CITIZEN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    route: 'CitizenDashboard',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    label: 'Report Issue',
    route: 'ReportIssue',
    icon: 'camera-outline',
    iconActive: 'camera',
  },
  {
    label: 'My Complaints',
    route: 'ComplaintHistory',
    icon: 'document-text-outline',
    iconActive: 'document-text',
  },
  {
    label: 'Notifications',
    route: 'Notifications',
    icon: 'notifications-outline',
    iconActive: 'notifications',
  },
  {
    label: 'Profile & Settings',
    route: 'CitizenProfile',
    icon: 'person-outline',
    iconActive: 'person',
  },
];

interface CitizenSidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export const CitizenSidebar: React.FC<CitizenSidebarProps> = ({
  activeRoute,
  onNavigate,
}) => {
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.logoArea}>
        <CivicTrackLogo size="sm" showText={false} />
        <View style={styles.brandText}>
          <Text style={styles.brandName}>Civic Track</Text>
          <View style={styles.portalTag}>
            <Text style={styles.portalTagText}>CITIZEN PORTAL</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Navigation Links */}
      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navContent}
      >
        <Text style={styles.navSectionHeader}>MAIN MENU</Text>

        {CITIZEN_NAV_ITEMS.map((item) => {
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
              {isActive && <View style={styles.activeBar} />}

              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={20}
                color={isActive ? COLORS.primary : isHovered ? COLORS.textPrimary : COLORS.slateMedium}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Info Card */}
      <View style={styles.footer}>
        <View style={styles.footerCard}>
          <View style={styles.footerHeader}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.footerTitle}>Civic Protection</Text>
          </View>
          <Text style={styles.footerDesc}>
            AI-assisted incident reporting for cleaner, safer communities.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.border,
    flexDirection: 'column',
    ...SHADOWS.card,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 16,
  },
  brandText: {
    marginLeft: 12,
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  portalTag: {
    marginTop: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
  },
  portalTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 18,
    marginBottom: 12,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
  navSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.16s ease-in-out' as any,
    } : {}),
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navItemHovered: {
    backgroundColor: COLORS.surface,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  navIcon: {
    marginRight: 12,
    width: 22,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  navLabelActive: {
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  navLabelHovered: {
    color: COLORS.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  footerDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
});
