import { COLORS } from '../../theme/colors';
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { complaintApi } from '../../api/complaintApi';
import { Complaint } from '../../types/complaint';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/SearchBar';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/date';

import { SkeletonBox, SkeletonCard, SkeletonStatCard } from '../../components/SkeletonLoader';
import { CivicHero, categoryPhoto } from '../../components/CivicVisuals';

const RED = COLORS.primary;
const INK = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CATEGORIES = [
  { id: 'pothole', label: 'Pothole', icon: 'car-outline' },
  { id: 'road_damage', label: 'Road Damage', icon: 'warning-outline' },
  { id: 'garbage', label: 'Garbage', icon: 'trash-outline' },
  { id: 'garbage_overflow', label: 'Garbage Overflow', icon: 'trash-bin-outline' },
  { id: 'broken_streetlight', label: 'Streetlights', icon: 'bulb-outline' },
  { id: 'water_leakage', label: 'Water Leakage', icon: 'water-outline' },
] as const;
const RANGES = [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 0, label: 'All time' }];

// Equal columns on native and web without percentage widths plus gaps overflowing.
const Grid = ({ children, columns }: { children: React.ReactNode[]; columns: number }) => (
  <View style={s.grid}>
    {Array.from({ length: Math.ceil(children.length / columns) }, (_, row) => (
      <View key={row} style={s.gridRow}>
        {children.slice(row * columns, (row + 1) * columns).map((child, i) => <View key={i} style={s.gridCell}>{child}</View>)}
      </View>
    ))}
  </View>
);

const IncidentSummary = ({ complaint: c, onPress }: { complaint: Complaint; onPress: () => void }) => {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View incident ${c.complaintId || c.title}`} onPress={onPress} style={s.incident} activeOpacity={0.8}>
      <View style={s.incidentTop}>
        <Text style={s.incidentCode}>{c.complaintId || c._id.slice(-8).toUpperCase()}</Text>
        <StatusBadge status={c.status} size="sm" />
      </View>
      <View style={s.incidentBody}>
        {c.imageUrl && !imageFailed ? <Image source={{ uri: c.imageUrl }} style={s.thumbnail} resizeMode="cover" onError={() => setImageFailed(true)} accessibilityLabel="Reported issue" /> : <View style={[s.thumbnail, s.placeholder]}><Ionicons name="image-outline" size={22} color={MUTED} /></View>}
        <View style={s.flex}>
          <Text style={s.incidentTitle} numberOfLines={2}>{c.customCategory || c.category.replace(/_/g, ' ')}</Text>
          <Text style={s.incidentDescription} numberOfLines={2}>{c.description || c.title}</Text>
        </View>
      </View>
      <View style={s.incidentLocation}><Ionicons name="location-outline" size={14} color={MUTED} /><Text style={s.locationText} numberOfLines={2}>{c.address}</Text></View>
      <View style={s.incidentBottom}><Text style={s.caption}>{formatDate(c.createdAt)}</Text><Text style={s.detailLink}>View details →</Text></View>
    </TouchableOpacity>
  );
};

export const CitizenDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { width, isDesktop, isWide } = useBreakpoint();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState(30);
  const twoColumns = width >= 1024;
  const fourColumns = (twoColumns ? (Math.min(width - 260, 1600) - 80) * 0.60 : width - (isDesktop ? 260 : 0) - 48) >= 540;
  const fetchData = useCallback(async () => {
    setError('');
    try {
      const result = await complaintApi.getMyComplaints();
      setComplaints([...result.complaints].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    } catch (e: any) { setError(e.message || 'Your reports could not be loaded. Please try again.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void fetchData(); }, [fetchData]));
  const periodComplaints = useMemo(() => complaints.filter(c => !range || Date.parse(c.createdAt) >= Date.now() - range * 86400000), [complaints, range]);
  const stats = { total: periodComplaints.length, pending: periodComplaints.filter(c => c.status === 'Pending').length, inProgress: periodComplaints.filter(c => c.status === 'In Progress').length, resolved: periodComplaints.filter(c => c.status === 'Resolved').length };
  const matches = useMemo(() => complaints.filter(c => [c.complaintId, c.title, c.description, c.category.replace(/_/g, ' '), c.address].some(v => v?.toLowerCase().includes(query.trim().toLowerCase()))), [complaints, query]);
  const firstName = user?.name?.split(' ')[0] || 'Citizen';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const openHistory = (filter = 'all') => navigation.navigate('ComplaintHistory', { filter, days: range });

  if (loading && !complaints.length) {
    return (
      <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
        <View style={[s.page, { padding: width < 600 ? 16 : 28 }]}>
          <SkeletonBox width={180} height={14} borderRadius={4} />
          <SkeletonBox width={260} height={32} borderRadius={8} style={{ marginVertical: 8 }} />
          <SkeletonBox width="100%" height={48} borderRadius={10} style={{ marginBottom: 16 }} />
          <View style={[s.body, twoColumns && s.bodyWide]}>
            <View style={[s.main, twoColumns && { flex: 1.5 }]}>
              <SkeletonBox width="100%" height={180} borderRadius={16} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <SkeletonStatCard />
                <SkeletonStatCard />
                <SkeletonStatCard />
                <SkeletonStatCard />
              </View>
            </View>
            <View style={[s.recent, twoColumns && { flex: 1 }]}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        testID="citizen-dashboard-scroll"
        contentContainerStyle={[
          s.page,
          {
            paddingHorizontal: width < 600 ? 16 : 28,
            paddingTop: width < 600 ? 16 : 28,
            paddingBottom: width < 600 ? 32 : 40,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchData(); }} colors={[RED]} />}
      >
        <View style={s.header}>
          <View style={s.welcome}>
            <Text style={s.eyebrow}>YOUR NEIGHBORHOOD. YOUR VOICE.</Text>
            <Text accessibilityRole="header" style={[s.greeting, width < 600 && { fontSize: 26, lineHeight: 34 }]}>{greeting}, {firstName}.</Text>
            <View style={s.welcomeMeta}><View style={s.citizenBadge}><Ionicons name="shield-checkmark-outline" size={13} color={RED} /><Text style={s.citizenBadgeText}>Citizen account</Text></View><Text style={s.subtitle}>A better city starts with you.</Text></View>
          </View>
          {!isWide && <View style={s.headerActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open notifications" style={s.iconButton} onPress={() => navigation.navigate('Notifications')}><Ionicons name="notifications-outline" size={21} color={INK} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open profile" style={[s.iconButton, s.avatar]} onPress={() => navigation.navigate('CitizenProfile')}>
              <Text style={s.avatarText}>
                {(user?.name || 'Citizen').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'C'}
              </Text>
            </TouchableOpacity>
          </View>}
        </View>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search your reports by issue, ID or location" style={s.search} />
        {!!error && <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text><Button title="Retry" variant="outline" onPress={fetchData} /></View>}
        <View style={[s.body, twoColumns && s.bodyWide]}>
          <View style={[s.main, twoColumns && { flex: 1.5 }]}>
            <CivicHero eyebrow="OUR STREETS. OUR FUTURE." title={'A stronger city\nstarts with you.'} description="Capture what needs attention. Share the location. Follow every step towards a better neighbourhood." photo="city" actionLabel="Report an Issue" onAction={() => navigation.navigate('ReportIssue')} />
            <View style={s.section}>
              <View style={s.sectionHeading}><Text accessibilityRole="header" style={s.sectionTitle}>Quick Issue Categories</Text><Text style={s.caption}>Start with an issue type</Text></View>
              <Grid columns={fourColumns ? 3 : 2}>{CATEGORIES.map(cat => <TouchableOpacity key={cat.id} accessibilityRole="button" accessibilityLabel={`Report ${cat.label}`} style={s.category} onPress={() => navigation.navigate('ReportIssue', { initialCategory: cat.id })}><Image source={categoryPhoto(cat.id)} accessible={false} style={{ width: '100%', height: 82, borderRadius: 7 }} resizeMode="cover" /><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name={cat.icon} size={17} color={RED} /><Text style={s.categoryLabel}>{cat.label}</Text></View></TouchableOpacity>)}</Grid>
            </View>
            <View style={s.section}>
              <View style={s.sectionHeading}><Text accessibilityRole="header" style={s.sectionTitle}>Activity Overview</Text><View accessibilityRole="radiogroup" accessibilityLabel="Activity date range" style={s.rangeGroup}>{RANGES.map(r => <TouchableOpacity key={r.value} accessibilityRole="button" accessibilityState={{ selected: range === r.value }} accessibilityLabel={r.label} onPress={() => setRange(r.value)} style={[s.rangeButton, range === r.value && s.rangeActive]}><Text style={[s.rangeLabel, range === r.value && s.rangeLabelActive]}>{r.label}</Text></TouchableOpacity>)}</View></View>
              <Grid columns={fourColumns ? 4 : 2}>{[
                { label: 'Total Reports', count: stats.total, icon: 'documents-outline', color: INK, filter: 'all' },
                { label: 'Pending', count: stats.pending, icon: 'time-outline', color: '#946000', filter: 'pending' },
                { label: 'In Progress', count: stats.inProgress, icon: 'construct-outline', color: '#235DA8', filter: 'in_progress' },
                { label: 'Resolved', count: stats.resolved, icon: 'checkmark-circle-outline', color: '#187047', filter: 'resolved' },
              ].map(stat => <TouchableOpacity key={stat.filter} accessibilityRole="button" accessibilityLabel={`${stat.label}: ${stat.count}`} onPress={() => openHistory(stat.filter)} style={s.metric}><Ionicons name={stat.icon as any} size={20} color={stat.color} /><Text style={[s.metricValue, { color: stat.color }]}>{error ? '—' : stat.count}</Text><Text style={s.metricLabel}>{stat.label}</Text></TouchableOpacity>)}</Grid>
              <View style={s.shortcuts}><Button title="Report map" variant="link" onPress={() => navigation.navigate('CitizenMap')} /><Button title="Civic Assistance" variant="link" onPress={() => navigation.navigate('CivicAssistant')} /><Button title="My Reports" variant="link" onPress={() => navigation.navigate('ComplaintHistory', { filter: 'all', days: 0 })} /><Button title="Notifications" variant="link" onPress={() => navigation.navigate('Notifications')} /></View>
            </View>
            <CivicHero compact photo="coast" eyebrow="FOR THE PLACES WE CALL HOME" title="Every neighbourhood matters." description="Report thoughtfully. Keep your community informed." />
          </View>
          <View testID="recent-incidents" style={[s.recent, twoColumns && { flex: 1 }]}>
            <View style={s.sectionHeading}><Text accessibilityRole="header" style={s.sectionTitle}>{query.trim() ? 'Search Results' : 'Recent Incidents'}</Text><Button title="See all" variant="link" onPress={() => navigation.navigate('ComplaintHistory', { filter: 'all', days: 0, search: query })} /></View>
            <Text style={s.recentIntro}>{query.trim() ? `${matches.length} matching reports` : 'Stay up to date with your latest reports.'}</Text>
            {matches.length ? matches.slice(0, 5).map(c => <IncidentSummary key={c._id} complaint={c} onPress={() => navigation.navigate('ComplaintDetail', { complaintId: c._id })} />) : <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="document-text-outline" size={30} color={RED} /></View><Text style={s.emptyTitle}>{error ? 'Reports unavailable' : query.trim() ? 'No matching reports' : 'Your first report starts here'}</Text><Text style={s.emptyText}>{error ? 'Retry loading your reports to see their latest status.' : query.trim() ? 'Try an issue type, a report ID, or a different location.' : 'Spotted an issue nearby? Report it and follow its progress right here.'}</Text><Button title={error ? 'Retry loading reports' : query.trim() ? 'Clear search' : 'Report your first issue'} variant="outline" onPress={error ? fetchData : query.trim() ? () => setQuery('') : () => navigation.navigate('ReportIssue')} /></View>}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F6', minWidth: 0 },
  page: { width: '100%', maxWidth: 1800, alignSelf: 'center', gap: 24, paddingBottom: 36 },
  flex: { flex: 1, minWidth: 0 }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  welcome: { flex: 1, minWidth: 200 }, eyebrow: { fontSize: 10, letterSpacing: 1.6, color: MUTED, fontWeight: '700', marginBottom: 9 },
  greeting: { fontSize: 32, lineHeight: 41, fontWeight: '700', color: INK, letterSpacing: -0.8 },
  welcomeMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  citizenBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#FCEEEE' }, citizenBadgeText: { color: RED, fontSize: 11, fontWeight: '600' },
  subtitle: { fontSize: 13, color: MUTED }, headerActions: { flexDirection: 'row', gap: 10 }, iconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#DFE7E2', alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: '#FCEEEE', borderColor: '#F1D8D8' }, avatarText: { fontSize: 14, fontWeight: '700', color: RED }, search: { marginBottom: 0 },
  body: { gap: 24 }, bodyWide: { flexDirection: 'row', alignItems: 'flex-start' }, main: { minWidth: 0, gap: 24 },
  reportCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E6DCDC', borderRadius: 16, padding: 24, borderTopWidth: 4, borderTopColor: RED },
  reportIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, reportEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, color: RED, marginBottom: 10 }, reportTitle: { fontSize: 29, lineHeight: 36, letterSpacing: -0.6, color: INK, fontWeight: '700' }, reportDescription: { color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 22, maxWidth: 520 }, reportFootnote: { fontSize: 11, color: MUTED, lineHeight: 18, marginTop: 14 },
  section: { gap: 14 }, sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionTitle: { fontSize: 17, fontWeight: '700', color: INK, flexShrink: 1 }, caption: { fontSize: 11, lineHeight: 17, color: MUTED },
  grid: { gap: 12 }, gridRow: { flexDirection: 'row', gap: 12 }, gridCell: { flex: 1, minWidth: 0 },
  category: { flex: 1, minHeight: 130, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.surface, padding: 14, alignItems: 'flex-start', gap: 10 }, categoryIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }, categoryLabel: { flex: 1, color: INK, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  rangeGroup: { flexDirection: 'row', backgroundColor: '#F0E7E1', borderRadius: 8, padding: 3 }, rangeButton: { minHeight: 40, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, rangeActive: { backgroundColor: COLORS.surface }, rangeLabel: { fontSize: 12, color: MUTED }, rangeLabelActive: { color: RED, fontWeight: '700' },
  metric: { minHeight: 128, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, backgroundColor: COLORS.surface, padding: 16, gap: 8 }, metricValue: { fontSize: 29, fontWeight: '700', lineHeight: 34 }, metricLabel: { fontSize: 12, color: MUTED, lineHeight: 18 }, shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  community: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, padding: 22, backgroundColor: COLORS.authorityPrimary }, communityTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: COLORS.surface }, communitySub: { fontSize: 11, lineHeight: 18, color: '#CBD5E1', marginTop: 7 },
  recent: { minWidth: 0, padding: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 16 }, recentIntro: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 4, marginBottom: 18 },
  incident: { paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#DFE7E2', gap: 12 }, incidentTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, incidentCode: { fontSize: 11, fontWeight: '700', color: RED }, incidentBody: { flexDirection: 'row', gap: 12 }, thumbnail: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#EDF2EF' }, placeholder: { justifyContent: 'center', alignItems: 'center' }, incidentTitle: { textTransform: 'capitalize', color: INK, fontWeight: '700', fontSize: 14, lineHeight: 20 }, incidentDescription: { fontSize: 12, lineHeight: 18, color: MUTED, marginTop: 4 }, incidentLocation: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' }, locationText: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 17, color: MUTED }, incidentBottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, detailLink: { color: RED, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 14 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: INK, fontWeight: '700', fontSize: 16, lineHeight: 23, textAlign: 'center' }, emptyText: { color: MUTED, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  error: { gap: 12, padding: 16, borderWidth: 1, borderColor: '#F1C6C6', backgroundColor: '#FFF4F4', borderRadius: 10 }, errorText: { color: RED, lineHeight: 21, fontSize: 14 },
});
