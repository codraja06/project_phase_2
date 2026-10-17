import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authorityApi } from '../api/authorityApi';
import { AnalyticsData, AnalyticsQuery } from '../types/analytics';
import { COLORS } from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AdaptiveGrid } from './AdaptiveGrid';
import { Button } from './ui/Button';
import { FilterChipGroup } from './FilterChip';
import { LoadingSpinner } from './LoadingSpinner';
import { AuthorityMobileHeader } from './AuthorityMobileHeader';
import { StatusBadge } from './StatusBadge';
import { TriageSummary } from './TriageSummary';
import { MapSurface } from './MapSurface';
import { CivicHero } from './CivicVisuals';

import { BarChart, SparkLine, MiniDonut } from './BarChart';
import { SkeletonStatCard, SkeletonList } from './SkeletonLoader';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const AuthorityInsights = ({ navigation, detailed = false }: { navigation: any; detailed?: boolean }) => {
  const { isWide, isDesktop } = useBreakpoint();
  const [draft, setDraft] = useState<AnalyticsQuery>({ from: daysAgo(29), to: today(), status: 'all', category: 'all', search: '' });
  const [query, setQuery] = useState(draft), [preset, setPreset] = useState('30');
  const [data, setData] = useState<AnalyticsData>(), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [table, setTable] = useState(false), [selectedGeo, setSelectedGeo] = useState(0);
  const request = useRef(0);
  const load = async () => {
    const id = ++request.current;
    try { setLoading(true); setError(''); const response = await authorityApi.getAnalytics(query); if (id === request.current) { setData(response); setSelectedGeo(0); } }
    catch (e: any) { if (id === request.current) setError(e.message || 'Analytics could not be loaded.'); }
    finally { if (id === request.current) setLoading(false); }
  };
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [query]));
  const openList = (extra = {}) => navigation.navigate('AllComplaints', { filter: query.status === 'Pending' ? 'pending' : query.status === 'In Progress' ? 'in_progress' : query.status === 'Resolved' ? 'resolved' : 'all', from: query.from, to: query.to, category: query.category, search: query.search, department: query.department, ...extra });
  const setRange = (range: string) => {
    setPreset(range); const next = { ...draft, from: range === 'all' ? undefined : daysAgo(Number(range) - 1), to: range === 'all' ? undefined : today() }; setDraft(next); setQuery(next);
  };
  const metrics = data ? [
    { key: 'total', name: 'Total complaints', value: data.summary.total, icon: 'layers-outline', color: COLORS.primary, filter: 'all' },
    { key: 'pending', name: 'Pending', value: data.summary.pending, icon: 'time-outline', color: COLORS.pendingDark, filter: 'pending' },
    { key: 'inProgress', name: 'In progress', value: data.summary.inProgress, icon: 'construct-outline', color: COLORS.inProgressDark, filter: 'in_progress' },
    { key: 'resolved', name: 'Resolved', value: data.summary.resolved, icon: 'checkmark-circle-outline', color: COLORS.resolvedDark, filter: 'resolved' },
    { key: 'high', name: 'High priority', value: data.summary.highPriority, icon: 'alert-circle-outline', color: COLORS.errorDark, filter: 'urgent' },
  ] : [];
  const point = data?.geography[selectedGeo];
  const trendCounts = (data?.trends || []).map(t => t.count);

  return <SafeAreaView style={styles.root}>
    {!isWide && <AuthorityMobileHeader title={detailed ? 'Municipal Analytics' : 'Command Center'} />}
    <ScrollView contentContainerStyle={[styles.page, isWide && { padding: 24 }]} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />} keyboardShouldPersistTaps="handled">
      <CivicHero compact photo="coast" eyebrow="CIVICTRACK / CITY INTELLIGENCE" title="A clearer view of civic progress." description="Patterns, priorities and resolution outcomes from actual complaint records." />
      <View style={styles.heading}>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>OVERVIEW / {detailed ? 'ANALYTICS' : 'OPERATIONS'}</Text><Text style={styles.title}>{detailed ? 'Municipal Analytics' : 'Command Center'}</Text><Text style={styles.subtitle}>Understand demand. Focus attention. Keep work moving.</Text></View>
        <Button title="View complaints" variant="outline" onPress={() => openList()} />
      </View>
      <View style={styles.filters}>
        <FilterChipGroup options={[{ label: '7 days', value: '7' }, { label: '30 days', value: '30' }, { label: 'All time', value: 'all' }]} selectedValue={preset} onSelect={setRange} />
        <AdaptiveGrid minWidth={180} maxColumns={isDesktop ? 5 : 3} gap={12}>
          <View><Text style={styles.fieldLabel}>From (UTC, YYYY-MM-DD)</Text><TextInput accessibilityLabel="Analytics start date" style={styles.input} value={draft.from || ''} placeholder="YYYY-MM-DD" onChangeText={from => { setPreset('custom'); setDraft({ ...draft, from: from || undefined }); }} /></View>
          <View><Text style={styles.fieldLabel}>To (UTC, YYYY-MM-DD)</Text><TextInput accessibilityLabel="Analytics end date" style={styles.input} value={draft.to || ''} placeholder="YYYY-MM-DD" onChangeText={to => { setPreset('custom'); setDraft({ ...draft, to: to || undefined }); }} /></View>
          <View><Text style={styles.fieldLabel}>Search reports</Text><TextInput accessibilityLabel="Search analytics" style={styles.input} value={draft.search || ''} placeholder="Issue, ID or location" onChangeText={search => setDraft({ ...draft, search })} /></View>
          <View><Text style={styles.fieldLabel}>Department</Text><TextInput accessibilityLabel="Analytics department" style={styles.input} value={draft.department || ''} placeholder="All departments" onChangeText={department => setDraft({ ...draft, department: department.trim() || undefined })} /></View>
          <View><Text style={styles.fieldLabel}>Category</Text><TextInput accessibilityLabel="Analytics category" style={styles.input} value={draft.category === 'all' ? '' : draft.category} placeholder="All or e.g. pothole" autoCapitalize="none" onChangeText={category => setDraft({ ...draft, category: category.trim() || 'all' })} /></View>
          <View style={{ justifyContent: 'flex-end' }}><Button title="Apply filters" onPress={() => setQuery({ ...draft })} disabled={loading} /></View>
        </AdaptiveGrid>
        <FilterChipGroup options={[{ label: 'All statuses', value: 'all' }, { label: 'Pending', value: 'Pending' }, { label: 'In Progress', value: 'In Progress' }, { label: 'Resolved', value: 'Resolved' }]} selectedValue={draft.status || 'all'} onSelect={status => setDraft({ ...draft, status })} />
      </View>
      {error ? (
        <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text><Button title="Retry" variant="outline" onPress={load} /></View>
      ) : loading && !data ? (
        <View style={{ gap: 16 }}>
          <AdaptiveGrid minWidth={132} maxColumns={5} gap={12}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </AdaptiveGrid>
          <SkeletonList count={3} />
        </View>
      ) : data && <>
        <AdaptiveGrid minWidth={132} maxColumns={5} gap={12}>
          {metrics.map(metric => <TouchableOpacity key={metric.key} accessibilityRole="button" accessibilityLabel={`${metric.name}: ${metric.value}`} onPress={() => openList({ filter: metric.filter })} style={styles.metric}>
            <View style={styles.metricHeader}>
              <Ionicons name={metric.icon as any} size={20} color={metric.color} />
              <Ionicons name="arrow-forward-outline" size={15} color={COLORS.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
              <Text style={styles.metricValue}>{metric.value.toLocaleString()}</Text>
              {trendCounts.length > 2 && (
                <SparkLine data={trendCounts.slice(-7)} width={50} height={20} color={metric.color} />
              )}
            </View>
            <Text style={styles.metricLabel}>{metric.name}</Text>
          </TouchableOpacity>)}
        </AdaptiveGrid>
        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text style={styles.panelTitle}>Resolution performance</Text>
              <Text style={styles.subtitle}>Completed duration = resolution timestamp − submission timestamp. Unresolved reports are excluded from the average. The date filter selects reports by submission date.</Text>
            </View>
            <MiniDonut resolved={data.summary.resolved} total={data.summary.total} size={64} />
          </View>
          <Text style={styles.subtitle}>Median completed hours: {data.medianResolutionHours?.toFixed(1) ?? 'Unavailable'} / Average unresolved age: {data.unresolvedAge?.averageHours?.toFixed(1) ?? 'Unavailable'} h / Oldest unresolved: {data.unresolvedAge?.oldestHours?.toFixed(1) ?? 'Unavailable'} h. Targets use elapsed hours.</Text>
          {(data.resolutionByCategory || []).map(row => <TouchableOpacity key={row.category} accessibilityRole="button" onPress={() => openList({ category: row.category, filter: 'resolved' })} style={styles.dataRow}><Text style={styles.dataLabel}>{label(row.category)}</Text><Text style={styles.dataNumber}>{row.resolved} resolved / {row.averageHours.toFixed(1)} h avg</Text></TouchableOpacity>)}
          <AdaptiveGrid minWidth={155} maxColumns={3} gap={10}>
            <View style={styles.metric}><Text style={styles.metricValue}>{data.summary.unresolved ?? data.summary.pending + data.summary.inProgress}</Text><Text style={styles.metricLabel}>Unresolved reports</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{data.summary.averageResolutionHours == null ? '—' : data.summary.averageResolutionHours.toFixed(1)}</Text><Text style={styles.metricLabel}>Average completed hours</Text></View>
            <TouchableOpacity accessibilityRole="button" disabled={data.resolutionTargetHours == null} onPress={() => openList({ overdue: true })} style={styles.metric}><Text style={styles.metricValue}>{data.resolutionTargetHours == null ? '—' : data.summary.overdue}</Text><Text style={styles.metricLabel}>{data.resolutionTargetHours == null ? 'No service target configured' : `Open beyond ${data.resolutionTargetHours} h target`}</Text></TouchableOpacity>
          </AdaptiveGrid>
          {(data.resolutionByDepartment || []).length ? <View><Text style={[styles.panelTitle, { marginTop: 16 }]}>Completed work by department</Text>
            <Text style={styles.subtitle}>Counts and average hours are shown together; workloads differ.</Text>
            {data.resolutionByDepartment.map(row => <TouchableOpacity key={row.department} accessibilityRole="button" onPress={() => openList({ department: row.department, filter: 'resolved' })} style={styles.dataRow}><Text style={styles.dataLabel}>{row.department}</Text><Text style={styles.dataNumber}>{row.resolved} resolved · {row.averageHours.toFixed(1)} h avg</Text></TouchableOpacity>)}
          </View> : <Text style={styles.subtitle}>No resolved reports with recorded department and valid timestamps in this view.</Text>}
          {(data.resolutionTrends || []).length > 0 && <View><Text style={[styles.panelTitle, { marginTop: 16 }]}>Resolution dates</Text>
            {data.resolutionTrends.map(row => <View key={row.date} style={styles.dataRow}><Text style={styles.dataLabel}>{row.date}</Text><Text style={styles.dataNumber}>{row.resolved} resolved · {row.averageHours.toFixed(1)} h avg</Text></View>)}
          </View>}
        </View>
        {data.summary.total === 0 ? <View style={styles.panel}><Text style={styles.panelTitle}>No complaints in this view</Text><Text style={styles.subtitle}>Adjust the date range or filters to see recorded activity.</Text></View> : <>
          <AdaptiveGrid minWidth={360} maxColumns={2}>
            <View style={styles.panel}><Text style={styles.panelTitle}>Complaint trends</Text><Text style={styles.subtitle}>Reports by submission day (UTC). Latest 90 reporting dates.</Text>
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <BarChart
                  data={data.trends.map(t => ({ label: t.date.slice(5), value: t.count }))}
                  height={160}
                  showValues={data.trends.length <= 14}
                />
              </View>
              <Button title={table ? 'Hide trend data' : 'Show trend data'} variant="ghost" size="sm" onPress={() => setTable(!table)} />
              {table && data.trends.map(trend => <View key={trend.date} style={styles.dataRow}><Text style={styles.dataLabel}>{trend.date}</Text><Text style={styles.dataNumber}>{trend.count} reports</Text></View>)}
            </View>
            <View style={styles.panel}><Text style={styles.panelTitle}>Issue categories</Text><Text style={styles.subtitle}>Most frequently reported categories in this view.</Text>
              {data.categories.map(category => <TouchableOpacity key={category.category} accessibilityRole="button" accessibilityLabel={`${label(category.category)}: ${category.count} reports`} onPress={() => openList({ category: category.category })} style={styles.category}>
                <View style={styles.dataRow}><Text style={styles.dataLabel}>{label(category.category)}</Text><Text style={styles.dataNumber}>{category.count} · {Math.round(category.count / data.summary.total * 100)}%</Text></View>
                <View style={styles.track}><View style={[styles.categoryFill, { width: `${category.count / data.summary.total * 100}%` }]} /></View>
              </TouchableOpacity>)}
            </View>
          </AdaptiveGrid>
          <View style={styles.panel}><View style={styles.heading}><View><Text style={styles.panelTitle}>Geographic distribution</Text><Text style={styles.subtitle}>Valid stored coordinates grouped into 0.1° cells. Up to 100 most reported cells.</Text></View></View>
            {point ? <View style={[styles.geoBody, isWide && { flexDirection: 'row' }]}>
              <View style={styles.geoMap}><MapSurface latitude={point.latitude} longitude={point.longitude} interactive pins={data.geography.map((g, index) => ({ id: String(index), latitude: g.latitude, longitude: g.longitude, title: `${g.count} reports`, address: `Coordinate cell ${g.label}` }))} onSelectPin={id => setSelectedGeo(Number(id))} /></View>
              <ScrollView style={isWide ? { width: 220, maxHeight: 280 } : { maxHeight: 160 }} contentContainerStyle={{ gap: 8 }}>{data.geography.map((g, index) => <TouchableOpacity key={g.label} accessibilityRole="button" accessibilityLabel={`Coordinate cell ${g.label}: ${g.count} reports`} onPress={() => setSelectedGeo(index)} style={[styles.geoCell, index === selectedGeo && { borderColor: COLORS.primary }]}><Text style={styles.dataLabel}>{g.label}</Text><Text style={styles.subtitle}>{g.count} reports</Text></TouchableOpacity>)}</ScrollView>
            </View> : <Text style={styles.subtitle}>No valid coordinates are available for the selected reports.</Text>}
          </View>
        </>}
        <View style={styles.panel}><View style={styles.heading}><View><Text style={styles.panelTitle}>Recent complaints</Text><Text style={styles.subtitle}>Latest reports matching the current filters.</Text></View><Button title="See all" variant="ghost" onPress={() => openList()} /></View>
          {data.recent.map(complaint => <TouchableOpacity key={complaint._id} accessibilityRole="button" accessibilityLabel={`Open complaint ${complaint.complaintId}`} onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: complaint._id })} style={styles.recent}>
            <View style={styles.recentHeader}><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.reference}>{complaint.complaintId}</Text><Text style={styles.recentTitle}>{complaint.title}</Text></View><StatusBadge status={complaint.status} size="sm" /></View>
            <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} priority={complaint.priority} score={complaint.priorityScore} compact /><Text style={styles.subtitle} numberOfLines={2}>{complaint.description}</Text>
          </TouchableOpacity>)}
        </View>
        <Text style={styles.footnote}>{data.summary.averageResolutionHours === null ? 'Resolution duration unavailable for this view.' : `Average recorded resolution time: ${data.summary.averageResolutionHours.toFixed(1)} hours.`} Priority is calculated from severity, category and age; authorities control status.</Text>
      </>}
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, page: { padding: 16, paddingBottom: 40, gap: 20 }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  eyebrow: { fontSize: 10, color: COLORS.primary, letterSpacing: 1.2, fontWeight: '700', marginBottom: 10 }, title: { fontSize: 28, lineHeight: 36, fontWeight: '600', color: COLORS.textPrimary, letterSpacing: -.7 }, subtitle: { fontSize: 12, lineHeight: 19, color: COLORS.textSecondary, marginTop: 4 },
  filters: { padding: 16, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.surface, borderRadius: 12, gap: 10 }, fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 7 }, input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 13, minHeight: 44, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  metric: { padding: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, minHeight: 126 }, metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }, metricValue: { color: COLORS.textPrimary, fontSize: 29, fontWeight: '600', letterSpacing: -.7 }, metricLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  panel: { padding: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12 }, panelTitle: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '600' }, chart: { marginTop: 20, height: 160, flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  barColumn: { flex: 1, minWidth: 0, height: 160, alignItems: 'center', justifyContent: 'flex-end' }, bar: { backgroundColor: COLORS.primary, width: '80%', borderTopLeftRadius: 3, borderTopRightRadius: 3, maxWidth: 42 }, barValue: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 4 }, barDate: { color: COLORS.textMuted, fontSize: 9, height: 22, paddingTop: 6 },
  dataRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }, dataLabel: { color: COLORS.textPrimary, flex: 1, fontSize: 13 }, dataNumber: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }, category: { marginTop: 14, minHeight: 44 }, track: { height: 7, borderRadius: 3, backgroundColor: COLORS.backgroundNeutral, marginTop: 5 }, categoryFill: { height: 7, backgroundColor: COLORS.secondary, borderRadius: 3 },
  geoBody: { gap: 16, marginTop: 14 }, geoMap: { flex: 1, height: 280, minHeight: 220, borderRadius: 8, overflow: 'hidden' }, geoCell: { padding: 10, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 8, minHeight: 48 }, recent: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: 12 }, recentHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, reference: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginBottom: 5 }, recentTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' }, footnote: { fontSize: 12, lineHeight: 19, color: COLORS.textMuted }, error: { padding: 16, gap: 12, backgroundColor: COLORS.errorLight, borderRadius: 8 }, errorText: { color: COLORS.errorDark, fontSize: 14, lineHeight: 21 },
});
