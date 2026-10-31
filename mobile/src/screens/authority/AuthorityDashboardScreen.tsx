import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { authorityApi } from '../../api/authorityApi';
import { Complaint } from '../../types/complaint';
import { AnalyticsData } from '../../types/analytics';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AuthorityMobileHeader } from '../../components/AuthorityMobileHeader';
import { Button } from '../../components/ui/Button';
import { TriageSummary } from '../../components/TriageSummary';
import { StatusBadge } from '../../components/StatusBadge';
import { BarChart } from '../../components/BarChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { RequestError } from '../../components/RequestError';
import { Disclosure } from '../../components/Disclosure';
import { PAGE } from '../../theme/layout';
import { COLORS } from '../../theme/colors';
import { formatDate } from '../../utils/date';

export const AuthorityDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { isWide } = useBreakpoint();
  const [data, setData] = useState<AnalyticsData>();
  const [queue, setQueue] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current; setLoading(true); setError('');
    try {
      const [analytics, pending, inProgress] = await Promise.all([
        authorityApi.getAnalytics({ status: 'all', category: 'all' }),
        authorityApi.getAllComplaints({ status: 'pending', sortBy: 'priority', page: 1, limit: 6 }),
        authorityApi.getAllComplaints({ status: 'in_progress', sortBy: 'priority', page: 1, limit: 6 }),
      ]);
      if (id !== request.current) return;
      setData(analytics);
      setQueue([...pending.complaints, ...inProgress.complaints].filter(c => c.status !== 'Resolved')
        .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(0, 6));
    } catch (e: any) { if (id === request.current) setError(e.message || 'Could not load your queue.'); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const metrics = data ? [
    { label: 'Pending', count: data.summary.pending, filter: 'pending' },
    { label: 'In progress', count: data.summary.inProgress, filter: 'in_progress' },
    { label: 'High priority', count: data.summary.highPriority, filter: 'urgent' },
  ] : [];
  return <SafeAreaView style={PAGE.root} edges={['top', 'left', 'right']}>
    {!isWide && <AuthorityMobileHeader title="Overview" />}
    <ScrollView contentContainerStyle={PAGE.content} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />}>
      <View style={s.hero}><View style={{ flex: 1, minWidth: 180 }}><Text style={s.eyebrow}>MUNICIPAL OPERATIONS</Text><Text accessibilityRole="header" style={[PAGE.title, { fontSize: 28, lineHeight: 36 }]}>Overview</Text><Text style={PAGE.body}>{user?.isAdmin ? 'Municipal operations · All departments' : user?.department || 'Department assignment required'}</Text></View><Button title="Open complaint queue" onPress={() => navigation.navigate('AllComplaints')} /></View>
      {error ? <RequestError message={error} onRetry={load} /> : loading && !data ? <LoadingSpinner message="Loading operations…" /> : data && <>
        <View style={s.metrics}>{metrics.map(m => <TouchableOpacity key={m.filter} accessibilityRole="button" accessibilityLabel={`${m.label}: ${m.count}`} onPress={() => navigation.navigate('AllComplaints', { filter: m.filter })} style={[s.metric, { borderTopColor: m.filter === 'urgent' ? COLORS.primary : m.filter === 'pending' ? '#B7791F' : '#3867A6' }]}><Ionicons name={m.filter === 'urgent' ? 'alert-circle-outline' : m.filter === 'pending' ? 'time-outline' : 'construct-outline'} size={22} color={COLORS.textSecondary} /><Text style={s.value}>{m.count}</Text><Text style={PAGE.body}>{m.label}</Text></TouchableOpacity>)}</View>
        <View style={s.panel}><View style={s.sectionLabel}><Ionicons name="alert-circle-outline" size={21} color={COLORS.primary} /><Text accessibilityRole="header" style={PAGE.heading}>Needs attention</Text></View><Text style={PAGE.body}>Unresolved complaints, highest priority first. Older reports come first when scores match.</Text>
          {queue.length ? queue.map(c => <TouchableOpacity key={c._id} accessibilityRole="button" accessibilityLabel={`Open complaint ${c.complaintId || c.title}`} onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: c._id })} style={s.report}>
            <View style={PAGE.header}><Text style={s.code}>{c.complaintId || c._id.slice(-6)}</Text><StatusBadge status={c.status} size="sm" /></View>
            <Text style={s.reportTitle}>{c.title}</Text><Text style={PAGE.body}>{c.address || 'Location recorded'} · {formatDate(c.createdAt)}</Text><TriageSummary severity={c.severity} severityReview={c.severityReview} priority={c.priority} compact />
          </TouchableOpacity>) : <Text style={PAGE.body}>No unresolved complaints in your queue.</Text>}
        </View>
        <View style={s.panel}><View style={PAGE.header}><Text accessibilityRole="header" style={PAGE.heading}>Recent reporting activity</Text><Button title="View analytics" variant="link" onPress={() => navigation.navigate('AuthorityAnalytics')} /></View>
          {data.trends.length ? <><Text style={PAGE.body}>Latest seven reporting dates (UTC).</Text><BarChart data={data.trends.slice(-7).map(t => ({ label: t.date.slice(5), value: t.count }))} height={140} showValues /><Disclosure title="View trend data">{data.trends.slice(-7).map(t => <Text key={t.date} style={PAGE.body}>{t.date}: {t.count} reports</Text>)}</Disclosure></> : <Text style={PAGE.body}>No reporting activity yet.</Text>}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
};
const s = StyleSheet.create({
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, backgroundColor: '#FFF5F4', padding: 24, borderRadius: 18, borderWidth: 1, borderColor: '#EFD5D3', borderTopWidth: 3, borderTopColor: COLORS.primary },
  eyebrow: { color: COLORS.primary, fontSize: 11, lineHeight: 18, letterSpacing: 1, fontWeight: '700', marginBottom: 8 },
  panel: { gap: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 14, padding: 20 },
  sectionLabel: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flex: 1, minWidth: 84, minHeight: 138, padding: 16, gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderTopWidth: 3, borderColor: COLORS.borderLight, borderRadius: 12 }, value: { fontSize: 28, lineHeight: 36, fontWeight: '700', color: COLORS.textPrimary },
  report: { paddingVertical: 16, gap: 6, borderBottomWidth: 1, borderColor: COLORS.borderLight },
  code: { color: COLORS.primary, fontSize: 12, fontWeight: '600' }, reportTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
});
