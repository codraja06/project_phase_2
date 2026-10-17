import { RequestError } from '../../components/RequestError';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { complaintApi } from '../../api/complaintApi';
import { Complaint } from '../../types/complaint';
import { COLORS } from '../../theme/colors';
import { BrandBackdrop, CivicHero } from '../../components/CivicVisuals';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ComplaintCard } from '../../components/ComplaintCard';
import { SearchBar } from '../../components/SearchBar';
import { FilterChipGroup } from '../../components/FilterChip';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const ComplaintHistoryScreen = ({ navigation, route }: any) => {
  const { isDesktop, isWide } = useBreakpoint();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route?.params?.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(route?.params?.filter || 'all');

  const fetchComplaints = async () => {
    try {
      setLoading(true); setLoadError('');
      const res = await complaintApi.getMyComplaints();
      setComplaints(res.complaints || []);
    } catch (error) {
      setLoadError((error as Error).message || 'Please check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.filter) {
        setStatusFilter(route.params.filter);
      }
      setSearchQuery(route?.params?.search || '');

      fetchComplaints();
    }, [route?.params?.filter, route?.params?.search, route?.params?.days])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (route?.params?.days && Date.parse(c.createdAt) < Date.now() - route.params.days * 86400000) return false;

      if (statusFilter !== 'all') {
        const norm = (c.status || '').toLowerCase().replace(' ', '_');
        if (norm !== statusFilter) return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (c.complaintId || '').toLowerCase().includes(q);
        const matchesTitle = (c.title || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesCat = (c.category || '').toLowerCase().includes(q);
        const matchesAddr = (c.address || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesDesc && !matchesCat && !matchesAddr) return false;
      }
      return true;
    });
  }, [complaints, statusFilter, searchQuery, route?.params?.days]);

  const filterOptions = [
    { label: 'All Reports', value: 'all', count: complaints.length },
    {
      label: 'Pending',
      value: 'pending',
      count: complaints.filter((c) => (c.status || '').toLowerCase() === 'pending').length},
    {
      label: 'In Progress',
      value: 'in_progress',
      count: complaints.filter((c) => (c.status || '').toLowerCase().includes('progress')).length},
    {
      label: 'Resolved',
      value: 'resolved',
      count: complaints.filter((c) => (c.status || '').toLowerCase() === 'resolved').length},
  ];

  const EmptyComponent = (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="documents-outline" size={40} color={COLORS.slateMedium} />
      </View>
      <Text style={styles.emptyTitle}>
        {complaints.length === 0 ? 'No complaints yet' : 'No complaints found'}
      </Text>
      <Text style={styles.emptySub}>
        {complaints.length === 0
          ? 'Your reported civic issues will appear here.'
          : searchQuery
          ? 'No incident reports match your current search criteria.'
          : 'You have not submitted any complaints in this status category.'}
      </Text>
      {complaints.length === 0 && (
        <TouchableOpacity
          style={styles.emptyReportBtn}
          onPress={() => navigation.navigate('ReportIssue')}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={18} color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
          <Text style={styles.emptyReportBtnText}>Report an Issue</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // ─── Desktop/Tablet Layout: wide container + two-column card grid ───────────────
  if (loadError) return <RequestError message={loadError} onRetry={fetchComplaints} />;

  if (isWide) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Desktop Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.desktopHeader}>
          <BrandBackdrop photo="bridge" opacity={.81} />
          <View style={styles.desktopHeaderLeft}>
            <Text style={styles.desktopTitle}>My Complaints</Text>
            <Text style={styles.desktopSubtitle}>
              Showing {filteredComplaints.length} of {complaints.length} registered reports
            </Text>
          </View>
          <View style={styles.desktopControls}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by ID, title, location or category..."
              style={styles.desktopSearch}
            />
          </View>
        </Animated.View>

        {/* Desktop Filter Bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.desktopFilterBar}>
          <FilterChipGroup
            options={filterOptions}
            selectedValue={statusFilter}
            onSelect={setStatusFilter}
            containerStyle={styles.desktopFilterChips}
          />
        </Animated.View>

        {loading && !refreshing ? (
          <LoadingSpinner message="Loading your community reports..." />
        ) : (
          <FlatList
            data={filteredComplaints}
            keyExtractor={(item) => item._id}
            numColumns={isDesktop ? 2 : 1}
            key={isDesktop ? 'desktop-2col' : 'tablet-1col'}
            columnWrapperStyle={isDesktop ? styles.desktopColumnWrapper : undefined}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(150 + index * 50)} style={isDesktop ? styles.desktopCardWrapper : { width: '100%' }}>
                <ComplaintCard
                  complaint={item}
                  onPress={() =>
                    (navigation as any).navigate('ComplaintDetail', { complaintId: item._id })
                  }
                />
              </Animated.View>
            )}
            contentContainerStyle={styles.desktopListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={EmptyComponent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Mobile / Tablet Single Column Layout ─────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Screen Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerBar}>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => navigation.navigate('CitizenDashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{filteredComplaints.length}</Text>
        </View>
      </Animated.View>

      {/* Search & Filter Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.filterSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search reports..."
          style={styles.searchBar}
        />
        <FilterChipGroup
          options={filterOptions}
          selectedValue={statusFilter}
          onSelect={setStatusFilter}
          containerStyle={styles.filterChips}
        />
      </Animated.View>

      {loading && !refreshing ? (
        <LoadingSpinner message="Loading complaints..." />
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(150 + index * 50)}>
              <ComplaintCard
                complaint={item}
                onPress={() =>
                  (navigation as any).navigate('ComplaintDetail', { complaintId: item._id })
                }
              />
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={{ marginBottom: 16 }}><CivicHero compact photo="bridge" eyebrow="YOUR REPORTS / YOUR PROGRESS" title="Every report has a story." description="Follow your submissions and their latest recorded status." /></View>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={EmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background},

  // Desktop Styles
  desktopHeader: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 150,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING['4xl'],
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background},
  desktopHeaderLeft: {
    flex: 1},
  desktopTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.onCinematic},
  desktopSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: '#DDE9E4',
    fontWeight: '500',
    marginTop: SPACING.xs},
  desktopControls: {
    width: 380},
  desktopSearch: {
    marginBottom: 0},
  desktopFilterBar: {
    paddingHorizontal: SPACING['4xl'],
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderLight},
  desktopFilterChips: {
    paddingVertical: SPACING.xs},
  desktopListContent: {
    paddingHorizontal: SPACING['4xl'],
    paddingTop: SPACING.xl,
    paddingBottom: SPACING['6xl']},
  desktopColumnWrapper: {
    gap: SPACING.xl},
  desktopCardWrapper: {
    flex: 1,
    maxWidth: '50%'},

  // Mobile Styles
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background},
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.md},
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary},
  countPill: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primarySurface},
  countPillText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.primary},
  filterSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight},
  searchBar: {
    marginBottom: SPACING.sm},
  filterChips: {
    paddingVertical: SPACING.xs},
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 32},
  emptyContainer: {
    padding: SPACING['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginTop: SPACING.xl,
    ...SHADOWS.card},
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.backgroundNeutral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg},
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs},
  emptySub: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280},
  emptyReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl},
  emptyReportBtnText: {
    ...TYPOGRAPHY.bodySmall, color: COLORS.surface,
    fontWeight: '700'}});
