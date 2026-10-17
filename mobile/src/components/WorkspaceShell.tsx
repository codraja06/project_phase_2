import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

import { NotificationBadge } from './NotificationBadge';
import { useUnreadCount } from '../hooks/useUnreadCount';

const CITIZEN = [
  ['CitizenDashboard', 'Dashboard', 'grid-outline'], ['ReportIssue', 'Report Issue', 'camera-outline'],
  ['ComplaintHistory', 'My Complaints', 'document-text-outline'], ['CitizenMap', 'Map', 'map-outline'],
  ['CivicAssistant', 'Civic Assistance', 'chatbubbles-outline'], ['Notifications', 'Notifications', 'notifications-outline'],
  ['CitizenProfile', 'Profile & Settings', 'person-circle-outline'],
];
const AUTHORITY = [
  ['AuthorityDashboard', 'Command Center', 'grid-outline'], ['AllComplaints', 'All Complaints', 'list-outline'],
  ['AuthorityMap', 'Incident Map', 'map-outline'], ['AuthorityAnalytics', 'Operations Analytics', 'bar-chart-outline'],
  ['AuthorityNotifications', 'Alerts & Feed', 'notifications-outline'], ['AuthorityProfile', 'Profile & Settings', 'person-circle-outline'],
];

export const WorkspaceShell = ({ role, activeRoute, onNavigate, children }: {
  role: 'citizen' | 'authority'; activeRoute: string; onNavigate: (route: string) => void; children: React.ReactNode;
}) => {
  const { width } = useBreakpoint();
  const { user } = useAuth();
  const { unreadCount } = useUnreadCount();
  const wide = width >= 768, expanded = width >= 1200;
  const items = role === 'citizen' ? CITIZEN : AUTHORITY;
  const current = items.find(i => i[0] === activeRoute)?.[1] || 'Complaint details';
  const profile = role === 'citizen' ? 'CitizenProfile' : 'AuthorityProfile';
  const alerts = role === 'citizen' ? 'Notifications' : 'AuthorityNotifications';
  return <View style={styles.root}>
    {wide && <View testID="workspace-sidebar" style={[styles.sidebar, { width: expanded ? 232 : 88 }]}>
      <View style={[styles.brand, !expanded && { paddingHorizontal: 8 }]}>
        <View style={styles.mark}><Ionicons name="business-outline" size={24} color={COLORS.gold} /></View>
        {expanded && <View><Text style={styles.brandName}>CivicTrack</Text><Text style={styles.brandSub}>Our streets. Our future.</Text></View>}
      </View>
      {expanded && <Text style={styles.workspaceLabel}>{role === 'citizen' ? 'CITIZEN WORKSPACE' : 'MUNICIPAL OPERATIONS'}</Text>}
      <ScrollView contentContainerStyle={{ padding: expanded ? 12 : 6, gap: 4 }}>
        {items.map(([route, label, icon]) => {
          const isNotif = route === 'Notifications' || route === 'AuthorityNotifications';
          return (
            <TouchableOpacity key={route} accessibilityRole="button" accessibilityLabel={label}
              accessibilityState={{ selected: route === activeRoute }} onPress={() => onNavigate(route)}
              style={[styles.nav, !expanded && styles.railNav, route === activeRoute && styles.selected]}>
              <View style={{ position: 'relative' }}>
                <Ionicons name={icon as any} size={21} color={route === activeRoute ? COLORS.gold : '#DDC8CF'} />
                {!expanded && isNotif && unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -6 }}>
                    <NotificationBadge count={unreadCount} dot />
                  </View>
                )}
              </View>
              <Text style={[styles.navText, !expanded && styles.railText, route === activeRoute && { color: COLORS.onCinematic, fontWeight: '700' }]}>
                {expanded ? label : label === 'Profile & Settings' ? 'Profile' : label === 'Operations Analytics' ? 'Analytics' : label}
              </Text>
              {expanded && isNotif && unreadCount > 0 && (
                <View style={{ marginLeft: 'auto' }}>
                  <NotificationBadge count={unreadCount} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open my profile" onPress={() => onNavigate(profile)} style={styles.account}>
        <View style={styles.avatar}><Text style={{ color: COLORS.primary, fontWeight: '700' }}>{(user?.name || 'U').slice(0, 1)}</Text></View>
        {expanded && <View style={{ flex: 1 }}><Text style={styles.accountName} numberOfLines={1}>{user?.name}</Text><Text style={styles.brandSub}>{role === 'citizen' ? 'Citizen account' : 'Authorized officer'}</Text></View>}
      </TouchableOpacity>
    </View>}
    <View style={styles.main}>
      {wide && <View testID="workspace-header" style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.breadcrumb}>{role === 'citizen' ? 'Your civic workspace' : 'Municipal workspace'}</Text><Text style={styles.pageTitle} numberOfLines={1}>{current}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open notifications" style={styles.iconButton} onPress={() => onNavigate(alerts)}>
          <Ionicons name="notifications-outline" size={21} color={COLORS.textSecondary} />
          {unreadCount > 0 && (
            <View style={{ position: 'absolute', top: 4, right: 4 }}>
              <NotificationBadge count={unreadCount} />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open profile" style={styles.iconButton} onPress={() => onNavigate(profile)}><Ionicons name="person-circle-outline" size={25} color={COLORS.primary} /></TouchableOpacity>
      </View>}
      <View style={styles.content}>{children}</View>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background, minWidth: 0 },
  sidebar: { backgroundColor: COLORS.cinematic, borderRightWidth: 1, borderRightColor: COLORS.authorityPrimary, borderTopWidth: 4, borderTopColor: COLORS.primary },
  brand: { minHeight: 92, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { height: 40, width: 40, borderRadius: 10, backgroundColor: COLORS.authorityPrimary, borderWidth: 1, borderColor: '#713648', justifyContent: 'center', alignItems: 'center' },
  brandName: { color: COLORS.onCinematic, fontSize: 20, letterSpacing: -.6, fontWeight: '800' },
  brandSub: { fontSize: 10, color: '#D3B8C2', marginTop: 3 },
  workspaceLabel: { fontSize: 9, color: COLORS.gold, letterSpacing: 1.5, paddingHorizontal: 24, marginBottom: 12 },
  nav: { flexDirection: 'row', gap: 11, alignItems: 'center', minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  navText: { flexShrink: 1, color: '#DDC8CF', fontSize: 13, fontWeight: '500' },
  selected: { backgroundColor: '#651C32', borderLeftWidth: 3, borderLeftColor: COLORS.gold }, railNav: { flexDirection: 'column', paddingHorizontal: 3, gap: 5 },
  railText: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  account: { margin: 12, paddingTop: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#5C2A3C', flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 60 },
  avatar: { height: 34, width: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  accountName: { color: COLORS.onCinematic, fontSize: 13, fontWeight: '600' }, main: { flex: 1, minWidth: 0 },
  header: { minHeight: 76, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, borderTopWidth: 4, borderTopColor: COLORS.primary },
  breadcrumb: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 }, pageTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '600' },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  content: { flex: 1, minWidth: 0, width: '100%', maxWidth: 1520, alignSelf: 'center' },
});
