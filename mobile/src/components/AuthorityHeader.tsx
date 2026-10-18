import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { TYPOGRAPHY } from '../theme/typography';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useMobileMenu } from '../contexts/MobileMenuContext';

interface AuthorityHeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
  showMenuToggle?: boolean;
}

const initialNotifications: { id: string; priority: string; title: string; time: string; read: boolean; icon: string; color: string }[] = [];

export const AuthorityHeader: React.FC<AuthorityHeaderProps> = ({
  title,
  subtitle,
  onMenuPress,
  showMenuToggle = false,
}) => {
  const { isDesktop, isMobile, width } = useBreakpoint();
  const navigation = useNavigation<any>();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { logout, user } = useAuth();
  const { toggleMenu } = useMobileMenu();
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleNotif = () => setIsNotifOpen(!isNotifOpen);

  // Close dropdown when pressing outside (simple implementation for web)
  useEffect(() => {
    if (Platform.OS === 'web' && isNotifOpen) {
      const listener = (e: any) => {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      };
      document.addEventListener('click', listener);
      return () => document.removeEventListener('click', listener);
    }
  }, [isNotifOpen, isProfileOpen]);

  return (
    <View style={[styles.headerContainer, { zIndex: isNotifOpen ? 100 : 50 }]}>
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          {showMenuToggle && (
            <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress || toggleMenu}>
              <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightSection}>
        {!isMobile && (
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color={COLORS.slateMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={isDesktop ? "Search incidents, ID, locations..." : "Search..."}
              placeholderTextColor={COLORS.slateMuted}
            />
            {isDesktop && (
              <View style={styles.shortcutKey}>
                <Text style={styles.shortcutText}>/</Text>
              </View>
            )}
          </View>
        )}

        {isDesktop && (
          <TouchableOpacity style={styles.dateSelector}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.slateDark} />
            <Text style={styles.dateText}>Today</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.slateMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.actionsWrapper}>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={[styles.iconBtn, isNotifOpen && styles.iconBtnActive]}
              onPress={(e) => {
                if (Platform.OS === 'web') e.stopPropagation();
                toggleNotif();
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.slateDark} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <View
                  style={[styles.notifDropdown, { right: isMobile ? -50 : 0, maxWidth: isMobile ? width - 32 : 360 }]}
                  //@ts-ignore
                  onClick={(e: any) => e.stopPropagation()}
                >
                <View style={styles.notifHeader}>
                  <Text style={styles.notifHeaderTitle}>Notifications</Text>
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={styles.notifHeaderLink}>Mark all as read</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.notifScroll} showsVerticalScrollIndicator={false}>
                  {notifications.length === 0 ? (
                    <View style={styles.notifEmpty}>
                      <Text style={styles.notifEmptyText}>No new notifications</Text>
                    </View>
                  ) : (
                    notifications.map(notif => (
                      <TouchableOpacity
                        key={notif.id}
                        style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                      >
                        <View style={styles.notifIconWrapper}>
                          <Ionicons name={notif.icon as any} size={16} color={notif.color} />
                        </View>
                        <View style={styles.notifContent}>
                          <Text style={[styles.notifPriority, { color: notif.color }]}>
                            {notif.priority.toUpperCase()}
                          </Text>
                          <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                            {notif.title}
                          </Text>
                          <Text style={styles.notifTime}>{notif.time}</Text>
                        </View>
                        {!notif.read && <View style={styles.notifDot} />}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={styles.notifFooter}
                  onPress={() => {
                    setIsNotifOpen(false);
                    navigation.navigate('AuthorityNotifications' as never);
                  }}
                >
                  <Text style={styles.notifFooterText}>View all notifications</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isDesktop && (
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="time-outline" size={20} color={COLORS.slateDark} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={[styles.profileDropdown, isProfileOpen && styles.iconBtnActive]}
              onPress={(e) => {
                if (Platform.OS === 'web') e.stopPropagation();
                setIsProfileOpen(!isProfileOpen);
                setIsNotifOpen(false);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'J'}</Text>
              </View>
              {isDesktop && (
                <>
                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>{user?.name || 'John Doe'}</Text>
                    <Text style={styles.profileRole}>{user?.role || 'Admin'}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color={COLORS.slateMuted} />
                </>
              )}
            </TouchableOpacity>

              {isProfileOpen && (
                <View
                  style={[styles.profileMenu, { right: 0 }]}
                  //@ts-ignore
                  onClick={(e: any) => e.stopPropagation()}
                >
                <View style={styles.profileMenuHeader}>
                  <Text style={styles.profileMenuName}>{user?.name || 'John Doe'}</Text>
                  <Text style={styles.profileMenuEmail}>{user?.email || 'admin@civictrack.gov'}</Text>
                </View>
                <View style={styles.profileMenuList}>
                  <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setIsProfileOpen(false); navigation.navigate('AuthorityProfile' as never); }}>
                    <Ionicons name="person-outline" size={18} color={COLORS.slateDark} />
                    <Text style={styles.profileMenuItemText}>My Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setIsProfileOpen(false); navigation.navigate('AuthorityProfile' as never); }}>
                    <Ionicons name="settings-outline" size={18} color={COLORS.slateDark} />
                    <Text style={styles.profileMenuItemText}>Settings</Text>
                  </TouchableOpacity>
                  <View style={styles.profileMenuDivider} />
                  <TouchableOpacity style={styles.profileMenuItem} onPress={logout}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.profileMenuItemText, { color: COLORS.error }]}>Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            </View>
          </View>
        </View>
      </View>
      {isMobile && (
        <View style={styles.mobileSearchRow}>
          <View style={styles.searchWrapperMobile}>
            <Ionicons name="search" size={16} color={COLORS.slateMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search incidents, ID, locations..."
              placeholderTextColor={COLORS.slateMuted}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...(Platform.OS === 'web' ? { position: 'relative' } : {}),
  },
  topRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  mobileSearchRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchWrapperMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuBtn: {
    marginRight: 16,
    padding: 4,
  },
  titleWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 140,
    maxWidth: 320,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease' as any,
    } : {}),
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    marginLeft: 8,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  shortcutKey: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slateMuted,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  iconBtnActive: {
    backgroundColor: '#F1F5F9',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Notification Dropdown
  notifDropdown: {
    position: 'absolute',
    top: 50,
    right: -12,
    width: 340,
    maxWidth: 'calc(100vw - 32px)' as any,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    zIndex: 9999,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notifHeaderTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  notifHeaderLink: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
  notifScroll: {
    maxHeight: 320,
  },
  notifEmpty: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifEmptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.slateMuted,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'flex-start',
  },
  notifItemUnread: {
    backgroundColor: '#F8FAFC',
  },
  notifIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  notifContent: {
    flex: 1,
  },
  notifPriority: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    marginBottom: 4,
  },
  notifTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notifTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.slateMuted,
    fontSize: 11,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  notifFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.lg,
  },
  notifFooterText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.primary,
  },

  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 4,
  },
  profileDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.md,
  },

  profileMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    zIndex: 9999,
  },
  profileMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  profileMenuName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  profileMenuEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileMenuList: {
    paddingVertical: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileMenuItemText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F2', // CivicTrack red light tint
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  avatarText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.error,
  },
  profileText: {
    justifyContent: 'center',
  },
  profileName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  profileRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
