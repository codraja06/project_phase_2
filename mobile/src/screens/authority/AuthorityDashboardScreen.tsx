import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authorityApi } from '../../api/authorityApi';
import { managementApi, HotspotCluster } from '../../api/managementApi';
import { Complaint } from '../../types/complaint';
import { AnalyticsData } from '../../types/analytics';
import { COLORS } from '../../theme/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAuth } from '../../hooks/useAuth';
import { AdaptiveGrid } from '../../components/AdaptiveGrid';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { TriageSummary } from '../../components/TriageSummary';
import { BarChart, SparkLine, MiniDonut } from '../../components/BarChart';
import { SkeletonStatCard, SkeletonList } from '../../components/SkeletonLoader';
import { AuthorityMobileHeader } from '../../components/AuthorityMobileHeader';
import { formatDate } from '../../utils/date';
import { CivicHero } from '../../components/CivicVisuals';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export const AuthorityDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { isWide, isDesktop, width } = useBreakpoint();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [hotspots, setHotspots] = useState<HotspotCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [analyticsRes, complaintsRes, hotspotsRes] = await Promise.all([
        authorityApi.getAnalytics({ from: daysAgo(7), to: today(), status: 'all', category: 'all' }),
        authorityApi.getAllComplaints({ limit: 15, page: 1 }),
        managementApi.getHotspots({}).catch(() => ({ clusters: [] })),
      ]);

      setAnalytics(analyticsRes);
      setComplaints(complaintsRes.complaints || []);
      setHotspots(hotspotsRes.clusters || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load command center data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  // Triage queue: items that are either Pending or marked High/Urgent priority
  const triageQueue = useMemo(() => {
    return complaints.filter(
      c =>
        c.status === 'Pending' ||
        c.priority === 'urgent' ||
        c.severity?.level === 'High' ||
        (c.priorityScore ?? 0) >= 70
    ).slice(0, 6);
  }, [complaints]);

  // Operational metrics
  const summary = analytics?.summary;
  const trendCounts = (analytics?.trends || []).map(t => t.count);

  const activeBacklog = (summary?.pending ?? 0) + (summary?.inProgress ?? 0);
  const urgentCount = summary?.highPriority ?? 0;
  const resolvedCount = summary?.resolved ?? 0;
  const totalCount = summary?.total ?? 0;

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      {!isWide && <AuthorityMobileHeader title="Command Center" />}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && { padding: 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData();
            }}
            colors={[COLORS.primary]}
          />
        }
      >
        <CivicHero compact photo="bridge" eyebrow="CIVICTRACK / MUNICIPAL OPERATIONS" title="Turn reports into visible progress." description="Review evidence, focus attention and keep citizens informed." />
        {/* Header row */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <View style={styles.statusPill}>
              <View style={styles.statusIndicatorLive} />
              <Text style={styles.statusText}>MUNICIPAL COMPLAINT WORKSPACE</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Operational Command Center
            </Text>
            <Text style={styles.subtitle}>
              Municipal incident triage, active fieldwork, and velocity monitoring.
            </Text>
          </View>

          <View style={styles.headerButtons}>
            <Button
              title="All Complaints"
              variant="outline"
              icon={<Ionicons name="list-outline" size={16} color={COLORS.textPrimary} />}
              onPress={() => navigation.navigate('AllComplaints')}
            />
            <Button
              title="Incident Map"
              variant="default"
              icon={<Ionicons name="map-outline" size={16} color="#FFFFFF" />}
              onPress={() => navigation.navigate('AuthorityMap')}
            />
          </View>
        </View>

        {/* Hotspot Alert Banner if clusters found */}
        {hotspots.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View hotspot clusters on map"
            style={styles.hotspotBanner}
            onPress={() => navigation.navigate('AuthorityMap')}
            activeOpacity={0.85}
          >
            <View style={styles.hotspotIconWrap}>
              <Ionicons name="warning-outline" size={22} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotspotTitle}>
                {hotspots.length} Geographic Report Group{hotspots.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.hotspotSub}>
                Observed reports grouped by location. Inspect counts and records on Incident Map.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* Error state */}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" variant="outline" onPress={loadData} />
          </View>
        ) : loading && !analytics ? (
          <View style={{ gap: 16 }}>
            <AdaptiveGrid minWidth={140} maxColumns={4} gap={12}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </AdaptiveGrid>
            <SkeletonList count={3} />
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <AdaptiveGrid minWidth={140} maxColumns={isDesktop ? 4 : 2} gap={12}>
              {/* Urgent Action Card */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Urgent queue: ${urgentCount} reports`}
                onPress={() => navigation.navigate('AllComplaints', { filter: 'urgent' })}
                style={[styles.kpiCard, urgentCount > 0 && styles.kpiUrgent]}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="flame-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.kpiBadge}>ACTION REQ</Text>
                </View>
                <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{urgentCount}</Text>
                <Text style={styles.kpiLabel}>Urgent Priority Triage</Text>
              </TouchableOpacity>

              {/* Active Backlog */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Active backlog: ${activeBacklog} reports`}
                onPress={() => navigation.navigate('AllComplaints', { filter: 'pending' })}
                style={styles.kpiCard}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time-outline" size={20} color="#D97706" />
                  </View>
                  {trendCounts.length > 2 && (
                    <SparkLine data={trendCounts.slice(-7)} width={46} height={18} color="#D97706" />
                  )}
                </View>
                <Text style={styles.kpiValue}>{activeBacklog}</Text>
                <Text style={styles.kpiLabel}>Active Workload</Text>
              </TouchableOpacity>

              {/* In Progress */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`In progress: ${summary?.inProgress ?? 0} reports`}
                onPress={() => navigation.navigate('AllComplaints', { filter: 'in_progress' })}
                style={styles.kpiCard}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="construct-outline" size={20} color="#2563EB" />
                  </View>
                  <Ionicons name="arrow-forward-outline" size={16} color={COLORS.textMuted} />
                </View>
                <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{summary?.inProgress ?? 0}</Text>
                <Text style={styles.kpiLabel}>In Progress & Fieldwork</Text>
              </TouchableOpacity>

              {/* Resolved / Velocity */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Resolved rate: ${resolutionRate}%`}
                onPress={() => navigation.navigate('AuthorityAnalytics')}
                style={styles.kpiCard}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color="#16A34A" />
                  </View>
                  <Text style={[styles.kpiBadge, { color: '#16A34A', backgroundColor: '#DCFCE7' }]}>
                    {resolutionRate}% RATE
                  </Text>
                </View>
                <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{resolvedCount}</Text>
                <Text style={styles.kpiLabel}>Resolved in 7 Days</Text>
              </TouchableOpacity>
            </AdaptiveGrid>

            {/* Split Grid: Triage Queue + 7-Day Velocity */}
            <AdaptiveGrid minWidth={360} maxColumns={2} gap={16}>
              {/* Triage Queue */}
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.panelTitle}>Priority Triage Queue</Text>
                    <Text style={styles.panelSubtitle}>
                      Unresolved reports ordered by recommended priority.
                    </Text>
                  </View>
                  <Button
                    title="View All"
                    variant="link"
                    onPress={() => navigation.navigate('AllComplaints', { filter: 'pending' })}
                  />
                </View>

                {triageQueue.length === 0 ? (
                  <View style={styles.emptyQueue}>
                    <Ionicons name="shield-checkmark" size={32} color="#16A34A" />
                    <Text style={styles.emptyQueueTitle}>All priority items triaged</Text>
                    <Text style={styles.emptyQueueSub}>
                      No pending critical incidents requiring immediate officer attention.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {triageQueue.map(c => (
                      <TouchableOpacity
                        key={c._id}
                        accessibilityRole="button"
                        accessibilityLabel={`Triage incident ${c.complaintId || c.title}`}
                        onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: c._id })}
                        style={styles.triageItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.triageTop}>
                          <Text style={styles.triageId}>{c.complaintId || c._id.slice(-6).toUpperCase()}</Text>
                          <StatusBadge status={c.status} size="sm" />
                        </View>
                        <Text style={styles.triageTitle} numberOfLines={1}>
                          {c.title || c.category.replace(/_/g, ' ')}
                        </Text>
                        <TriageSummary
                          severity={c.severity} severityReview={c.severityReview}
                          priority={c.priority}
                          score={c.priorityScore}
                          compact
                        />
                        <View style={styles.triageMeta}>
                          <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {c.address || 'Address provided via GPS'}
                            </Text>
                          </View>
                          <Text style={styles.metaDate}>{formatDate(c.createdAt)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 7-Day Velocity Chart & Resolution Summary */}
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.panelTitle}>7-Day Intake Velocity</Text>
                    <Text style={styles.panelSubtitle}>Daily submission volume across all municipal sectors.</Text>
                  </View>
                  <Button
                    title="Analytics"
                    variant="link"
                    onPress={() => navigation.navigate('AuthorityAnalytics')}
                  />
                </View>

                {analytics?.trends && analytics.trends.length > 0 ? (
                  <View style={{ marginTop: 8, marginBottom: 16 }}>
                    <BarChart
                      data={analytics.trends.slice(-7).map(t => ({
                        label: t.date.slice(5),
                        value: t.count,
                      }))}
                      height={150}
                      showValues
                    />
                  </View>
                ) : (
                  <Text style={styles.emptyQueueSub}>No trend intake recorded for this period.</Text>
                )}

                {/* Resolution Summary Row */}
                <View style={styles.resolutionRow}>
                  <MiniDonut
                    resolved={summary?.resolved ?? 0}
                    total={summary?.total ?? 1}
                    size={54}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.resolutionTitle}>
                      {resolutionRate}% Overall Resolution Rate
                    </Text>
                    <Text style={styles.resolutionSub}>
                      {summary?.averageResolutionHours != null
                        ? `Avg completion time: ${summary.averageResolutionHours.toFixed(1)} hours.`
                        : 'Tracking resolution turnaround times across assigned departments.'}
                    </Text>
                  </View>
                </View>

                {/* Quick Department Shortcuts */}
                <View style={styles.quickActions}>
                  <Text style={styles.quickActionLabel}>QUICK SHORTCUTS</Text>
                  <View style={styles.shortcutRow}>
                    <TouchableOpacity
                      style={styles.chipButton}
                      onPress={() => navigation.navigate('AllComplaints', { category: 'pothole' })}
                    >
                      <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.chipText}>Potholes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chipButton}
                      onPress={() => navigation.navigate('AllComplaints', { category: 'garbage' })}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.chipText}>Sanitation</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chipButton}
                      onPress={() => navigation.navigate('AllComplaints', { status: 'in_progress' })}
                    >
                      <Ionicons name="construct-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.chipText}>Field Crews</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </AdaptiveGrid>

            {/* Recent Live Feed */}
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Recent Incident Feed</Text>
                  <Text style={styles.panelSubtitle}>Live incoming reports from citizen channels.</Text>
                </View>
                <Button
                  title="See All Reports"
                  variant="ghost"
                  onPress={() => navigation.navigate('AllComplaints')}
                />
              </View>

              <View style={{ gap: 8 }}>
                {complaints.slice(0, 5).map(c => (
                  <TouchableOpacity
                    key={c._id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open complaint ${c.complaintId || c.title}`}
                    onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: c._id })}
                    style={styles.feedItem}
                  >
                    <View style={styles.feedLeft}>
                      <View style={styles.feedIcon}>
                        <Ionicons
                          name={
                            c.category === 'pothole'
                              ? 'car-outline'
                              : c.category.includes('garbage')
                              ? 'trash-outline'
                              : 'alert-circle-outline'
                          }
                          size={18}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.feedCode}>{c.complaintId || c._id.slice(-6).toUpperCase()}</Text>
                          <Text style={styles.feedTitle} numberOfLines={1}>
                            {c.title || c.category.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={styles.feedAddress} numberOfLines={1}>
                          {c.address || 'Location stored'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={c.status} size="sm" />
                      <Text style={styles.feedTime}>{formatDate(c.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background || '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusIndicatorLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  hotspotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  hotspotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  hotspotSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  kpiCard: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  kpiUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  panel: {
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  panelSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  triageItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  triageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triageId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  triageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  triageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  metaDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyQueue: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyQueueSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    backgroundColor: COLORS.background || '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  resolutionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resolutionSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  quickActions: {
    marginTop: 4,
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  feedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  feedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  feedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight || '#EDF2EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  feedAddress: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  feedTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },
});
