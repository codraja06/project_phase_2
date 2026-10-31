import { PAGE } from '../../theme/layout';
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
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { formatDate } from '../../utils/date';

const RED = '#B71C1C';
const INK = '#17243A';
const MUTED = '#536176';
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
  const { width } = useBreakpoint();
  const { unreadCount } = useUnreadCount();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    setError('');
    try { const result = await complaintApi.getMyComplaints(); setComplaints([...result.complaints].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))); }
    catch (e: any) { setError(e.message || 'Your complaints could not be loaded.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void fetchData(); }, [fetchData]));
  if (loading) return <LoadingSpinner message="Loading your complaints…" />;
  return <SafeAreaView style={PAGE.root} edges={['top', 'left', 'right']}>
    <StatusBar barStyle="dark-content" />
    <ScrollView testID="citizen-dashboard-scroll" contentContainerStyle={PAGE.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchData(); }} colors={[RED]} />}>
      <View style={PAGE.header}>
        <View style={{ flex: 1, minWidth: 160 }}><Text accessibilityRole="header" style={PAGE.title}>Hello, {user?.name?.split(' ')[0] || 'Citizen'}.</Text><Text style={PAGE.body}>Report a local issue and follow its progress.</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Notifications: ${unreadCount} unread`} style={s.iconButton} onPress={() => navigation.navigate('Notifications')}><Ionicons name="notifications-outline" size={22} color={INK} />{unreadCount > 0 && <Text style={s.detailLink}>{unreadCount}</Text>}</TouchableOpacity>
      </View>
      <View style={[s.reportCard, width >= 1100 && { flexDirection: 'row', alignItems: 'center', gap: 32 }]}>
        <View style={{ flex: 1, minWidth: 0 }}><View style={s.reportIcon}><Ionicons name="camera-outline" size={28} color={RED} /></View><Text style={s.reportEyebrow}>YOUR NEIGHBORHOOD. YOUR VOICE.</Text><Text accessibilityRole="header" style={s.reportTitle}>Small reports. Meaningful change.</Text><Text style={s.reportDescription}>Spotted a civic issue? Capture a photo, confirm the details and follow the response from your local authority.</Text><Button title="Report an Issue" onPress={() => navigation.navigate('ReportIssue')} icon={<Ionicons name="add" size={20} color="#fff" />} style={{ alignSelf: width >= 600 ? 'flex-start' : 'stretch' }} /></View>
        {width >= 1100 && <View style={s.heroGuide}>{[{ icon: 'camera-outline', title: 'Capture the issue', detail: 'Add a clear photo of what you see.' }, { icon: 'location-outline', title: 'Confirm the location', detail: 'Help the right team find the issue.' }, { icon: 'checkmark-circle-outline', title: 'Track the response', detail: 'See updates as your report progresses.' }].map((step, i) => <View key={step.title} style={s.guideRow}><View style={s.guideIcon}><Ionicons name={step.icon as any} size={20} color={RED} /></View><View style={{ flex: 1 }}><Text style={s.guideTitle}>{step.title}</Text><Text style={s.caption}>{step.detail}</Text></View></View>)}</View>}
      </View>
      {error ? <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text><Button title="Retry" variant="outline" onPress={fetchData} /></View> : <>
        <View style={s.statusSummary}>{[
          { label: 'Pending', status: 'Pending', filter: 'pending' },
          { label: 'In progress', status: 'In Progress', filter: 'in_progress' },
          { label: 'Resolved', status: 'Resolved', filter: 'resolved' },
        ].map(item => { const count = complaints.filter(c => c.status === item.status).length; return <TouchableOpacity key={item.filter} accessibilityRole="button" accessibilityLabel={`${item.label}: ${count}`} onPress={() => navigation.navigate('ComplaintHistory', { filter: item.filter, days: 0 })} style={[s.statusItem, { borderTopColor: item.filter === 'pending' ? '#B7791F' : item.filter === 'in_progress' ? '#3867A6' : '#23815C' }]}><Ionicons name={item.filter === 'pending' ? 'time-outline' : item.filter === 'in_progress' ? 'construct-outline' : 'checkmark-circle-outline'} size={20} color={INK} /><Text style={s.metricValue}>{count}</Text><Text style={s.metricLabel}>{item.label}</Text></TouchableOpacity>; })}</View>
        <View testID="recent-incidents" style={s.recent}><View style={PAGE.header}><Text accessibilityRole="header" style={PAGE.heading}>Recent complaints</Text><Button title="View all" variant="link" onPress={() => navigation.navigate('ComplaintHistory', { filter: 'all', days: 0 })} /></View>
          {complaints.length ? complaints.slice(0, 3).map(c => <IncidentSummary key={c._id} complaint={c} onPress={() => navigation.navigate('ComplaintDetail', { complaintId: c._id })} />) : <Text style={PAGE.body}>No complaints yet. Your submitted reports and their updates will appear here.</Text>}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
};

const s = StyleSheet.create({
  heroGuide: { width: 300, gap: 24, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 14 },
  guideRow: { flexDirection: 'row', gap: 12, alignItems: 'center' }, guideIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF1F0', alignItems: 'center', justifyContent: 'center' }, guideTitle: { color: INK, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  statusSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusItem: { flex: 1, minWidth: 84, minHeight: 128, gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E5EB', borderTopWidth: 3, borderRadius: 12, padding: 16 },
  screen: { flex: 1, backgroundColor: '#F5F7FA', minWidth: 0 },
  page: { width: '100%', maxWidth: 1800, alignSelf: 'center', gap: 24, paddingBottom: 36 },
  flex: { flex: 1, minWidth: 0 }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  welcome: { flex: 1, minWidth: 200 }, eyebrow: { fontSize: 10, letterSpacing: 1.6, color: MUTED, fontWeight: '700', marginBottom: 9 },
  greeting: { fontSize: 32, lineHeight: 41, fontWeight: '700', color: INK, letterSpacing: -0.8 },
  welcomeMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  citizenBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#FCEEEE' }, citizenBadgeText: { color: RED, fontSize: 11, fontWeight: '600' },
  subtitle: { fontSize: 13, color: MUTED }, headerActions: { flexDirection: 'row', gap: 10 }, iconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE4EB', alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: '#FCEEEE', borderColor: '#F1D8D8' }, avatarText: { fontSize: 14, fontWeight: '700', color: RED }, search: { marginBottom: 0 },
  body: { gap: 24 }, bodyWide: { flexDirection: 'row', alignItems: 'flex-start' }, main: { minWidth: 0, gap: 24 },
  reportCard: { backgroundColor: '#FFF5F4', borderWidth: 1, borderColor: '#EFD5D3', borderRadius: 18, padding: 24, borderTopWidth: 3, borderTopColor: RED },
  reportIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FCF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, reportEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, color: RED, marginBottom: 10 }, reportTitle: { fontSize: 29, lineHeight: 36, letterSpacing: -0.6, color: INK, fontWeight: '700' }, reportDescription: { color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 22, maxWidth: 520 }, reportFootnote: { fontSize: 11, color: MUTED, lineHeight: 18, marginTop: 14 },
  section: { gap: 14 }, sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionTitle: { fontSize: 17, fontWeight: '700', color: INK, flexShrink: 1 }, caption: { fontSize: 11, lineHeight: 17, color: MUTED },
  grid: { gap: 12 }, gridRow: { flexDirection: 'row', gap: 12 }, gridCell: { flex: 1, minWidth: 0 },
  category: { flex: 1, minHeight: 130, borderRadius: 12, borderWidth: 1, borderColor: '#E1E5EB', backgroundColor: '#FFFFFF', padding: 14, alignItems: 'flex-start', gap: 10 }, categoryIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FCF0F0', alignItems: 'center', justifyContent: 'center' }, categoryLabel: { flex: 1, color: INK, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  rangeGroup: { flexDirection: 'row', backgroundColor: '#E9EDF2', borderRadius: 8, padding: 3 }, rangeButton: { minHeight: 40, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, rangeActive: { backgroundColor: '#FFFFFF' }, rangeLabel: { fontSize: 12, color: MUTED }, rangeLabelActive: { color: RED, fontWeight: '700' },
  metric: { minHeight: 128, borderWidth: 1, borderColor: '#E1E5EB', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 16, gap: 8 }, metricValue: { fontSize: 29, fontWeight: '700', lineHeight: 34 }, metricLabel: { fontSize: 12, color: MUTED, lineHeight: 18 }, shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  community: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, padding: 22, backgroundColor: '#17243A' }, communityTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' }, communitySub: { fontSize: 11, lineHeight: 18, color: '#CBD5E1', marginTop: 7 },
  recent: { minWidth: 0, padding: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E5EB', borderRadius: 16 }, recentIntro: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 4, marginBottom: 18 },
  incident: { paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#E8ECF1', gap: 12 }, incidentTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, incidentCode: { fontSize: 11, fontWeight: '700', color: RED }, incidentBody: { flexDirection: 'row', gap: 12 }, thumbnail: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F1F4F8' }, placeholder: { justifyContent: 'center', alignItems: 'center' }, incidentTitle: { textTransform: 'capitalize', color: INK, fontWeight: '700', fontSize: 14, lineHeight: 20 }, incidentDescription: { fontSize: 12, lineHeight: 18, color: MUTED, marginTop: 4 }, incidentLocation: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' }, locationText: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 17, color: MUTED }, incidentBottom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, detailLink: { color: RED, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 14 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCF0F0', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: INK, fontWeight: '700', fontSize: 16, lineHeight: 23, textAlign: 'center' }, emptyText: { color: MUTED, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  error: { gap: 12, padding: 16, borderWidth: 1, borderColor: '#F1C6C6', backgroundColor: '#FFF4F4', borderRadius: 10 }, errorText: { color: RED, lineHeight: 21, fontSize: 14 },
});
