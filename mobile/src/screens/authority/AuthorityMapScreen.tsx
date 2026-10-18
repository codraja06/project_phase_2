import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MapSurface } from '../../components/MapSurface';
import { AuthorityMobileHeader } from '../../components/AuthorityMobileHeader';
import { FilterChipGroup } from '../../components/FilterChip';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { managementApi, HotspotCluster } from '../../api/managementApi';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { COLORS } from '../../theme/colors';

type Filters = { category?: string; status?: string; priority?: string; from?: string; to?: string };

const CATEGORY_CHIPS = [
  { label: 'All types', value: 'all' },
  { label: 'Potholes', value: 'pothole' },
  { label: 'Road Damage', value: 'road_damage' },
  { label: 'Garbage', value: 'garbage' },
  { label: 'Animals', value: 'dead_animal' },
  { label: 'Trees', value: 'broken_tree' },
  { label: 'Streetlights', value: 'broken_streetlight' },
  { label: 'Water leakage', value: 'water_leakage' },
  { label: 'Drainage', value: 'drainage' },
  { label: 'Other', value: 'other' },
];

export const AuthorityMapScreen = ({ navigation }: any) => {
  const { isWide } = useBreakpoint();
  const [draft, setDraft] = useState<Filters>({ status: 'all', priority: 'all', category: 'all' });
  const [query, setQuery] = useState<Filters>(draft);
  const [cellDegrees, setCellDegrees] = useState(.01);
  const [windowDays, setWindowDays] = useState(30);
  const [clusters, setClusters] = useState<HotspotCluster[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        ...query,
        category: query.category === 'all' ? undefined : query.category,
        status: query.status === 'all' ? undefined : query.status,
        priority: query.priority === 'all' ? undefined : query.priority,
      };
      const data = await managementApi.getHotspots({ ...params, cellDegrees });
      setClusters(data.clusters); setWindowDays(data.windowDays);
      setSelected(0);
    } catch (e: any) {
      setError(e.message || 'Could not load complaint hotspots.');
    } finally {
      setLoading(false);
    }
  }, [query, cellDegrees]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const current = clusters[selected];
  const totalReportsInClusters = clusters.reduce((sum, c) => sum + c.count, 0);

  return (
    <SafeAreaView style={styles.root}>
      {!isWide && <AuthorityMobileHeader title="Incident Map" />}
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Incident Hotspots & Geographic Density</Text>
            <Text style={styles.subtitle}>
              GPS-reported complaints grouped into adjustable geographic grid cells. Click any cluster pin or cell to inspect underlying reports.
            </Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.statBadgeText}>
              {clusters.length} Cell{clusters.length === 1 ? '' : 's'} · {totalReportsInClusters} Reports
            </Text>
          </View>
        </View>

        <FilterChipGroup options={[{ label: 'Block / 0.001 degrees', value: '.001' }, { label: 'Neighbourhood / 0.01 degrees', value: '.01' }, { label: 'Area / 0.05 degrees', value: '.05' }]} selectedValue={String(cellDegrees).replace(/^0/, '')} onSelect={value => setCellDegrees(Number(value))} />
        <Text style={{ color: COLORS.textSecondary }}>Geographic grid counts. Default window: last {windowDays} days unless dates are selected. These are observed report concentrations.</Text>
        {/* Filter Bar */}
        <View style={styles.filterCard}>
          <View style={{ gap: 8 }}>
            <Text style={styles.filterTitle}>FILTER BY STATUS & CATEGORY</Text>
            <FilterChipGroup
              options={[
                { label: 'All statuses', value: 'all' },
                { label: 'Pending', value: 'Pending' },
                { label: 'In progress', value: 'In Progress' },
                { label: 'Resolved', value: 'Resolved' },
              ]}
              selectedValue={draft.status || 'all'}
              onSelect={status => setDraft({ ...draft, status })}
            />
            <FilterChipGroup
              options={CATEGORY_CHIPS}
              selectedValue={draft.category || 'all'}
              onSelect={category => setDraft({ ...draft, category })}
            />
            <FilterChipGroup
              options={[
                { label: 'All priorities', value: 'all' },
                { label: 'High Priority', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
              selectedValue={draft.priority || 'all'}
              onSelect={priority => setDraft({ ...draft, priority })}
            />
          </View>

          <View style={styles.filterBottom}>
            <View style={styles.dateInputs}>
              <TextInput
                accessibilityLabel="Hotspot start date"
                style={styles.dateInput}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={draft.from || ''}
                onChangeText={from => setDraft({ ...draft, from: from || undefined })}
              />
              <TextInput
                accessibilityLabel="Hotspot end date"
                style={styles.dateInput}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={draft.to || ''}
                onChangeText={to => setDraft({ ...draft, to: to || undefined })}
              />
            </View>
            <Button title="Apply Filters" onPress={() => setQuery({ ...draft })} />
          </View>
        </View>

        {!!error && (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" variant="outline" onPress={load} />
          </View>
        )}

        {loading ? (
          <LoadingSpinner message="Aggregating geographic incident clusters…" />
        ) : (
          <View style={[styles.mapContainer, isWide && styles.mapContainerWide]}>
            {/* Map Canvas */}
            <View style={styles.mapCanvas}>
              {current ? (
                <MapSurface
                  latitude={current.latitude}
                  longitude={current.longitude}
                  interactive
                  zoom={cellDegrees <= .001 ? 17 : cellDegrees <= .01 ? 14 : 11}
                  onZoomChange={zoom => setCellDegrees(zoom >= 16 ? .001 : zoom >= 13 ? .01 : .05)}
                  pins={clusters.map((cluster, index) => ({
                    id: String(index),
                    latitude: cluster.latitude,
                    longitude: cluster.longitude,
                    title: `${cluster.count} incident${cluster.count === 1 ? '' : 's'}`,
                    address: `Coordinates: ${cluster.latitude.toFixed(3)}, ${cluster.longitude.toFixed(3)}`,
                  }))}
                  onSelectPin={id => setSelected(Number(id))}
                />
              ) : (
                <View style={styles.emptyMap}>
                  <Ionicons name="map-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyMapText}>
                    No complaints with valid GPS coordinates match current filters.
                  </Text>
                </View>
              )}
            </View>

            {/* Clusters Sidebar / Details */}
            <View style={styles.sidebar}>
              <Text style={styles.sectionHeading}>Geographic report counts ({clusters.length})</Text>
              <ScrollView style={{ maxHeight: isWide ? 220 : 140 }} contentContainerStyle={{ gap: 6 }}>
                {clusters.map((cluster, index) => {
                  const isHighDensity = false;
                  const isCurrent = selected === index;
                  return (
                    <TouchableOpacity
                      key={`${cluster.latitude}-${cluster.longitude}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Cluster ${index + 1}: ${cluster.count} complaints`}
                      onPress={() => setSelected(index)}
                      style={[
                        styles.clusterChip,
                        isCurrent && styles.clusterChipActive,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={isHighDensity ? 'flame' : 'location'}
                          size={16}
                          color={isCurrent ? COLORS.primary : isHighDensity ? '#DC2626' : COLORS.textMuted}
                        />
                        <Text style={[styles.clusterText, isCurrent && styles.clusterTextActive]}>
                          {cluster.count} report{cluster.count === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Text style={styles.clusterCoords}>
                        {cluster.latitude.toFixed(3)}, {cluster.longitude.toFixed(3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected Cluster Details Panel */}
              {current && (
                <View style={styles.detailPanel}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>
                      Cell Details ({current.count} report{current.count === 1 ? '' : 's'})
                    </Text>
                    <Text style={styles.detailCoords}>
                      GPS: {current.latitude.toFixed(4)}, {current.longitude.toFixed(4)}
                    </Text>
                  </View>

                  <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 8 }}>
                    {current.records.map(record => (
                      <TouchableOpacity
                        key={record._id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open complaint ${record.complaintId || record.title}`}
                        onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: record._id })}
                        style={styles.recordCard}
                      >
                        <View style={styles.recordTop}>
                          <Text style={styles.recordId}>{record.complaintId}</Text>
                          <StatusBadge status={record.status} size="sm" />
                        </View>
                        <Text numberOfLines={2} style={styles.recordTitle}>
                          {record.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {current.count > current.records.length && (
                    <Text style={styles.moreNote}>
                      Showing top {current.records.length} of {current.count} reports in this coordinate cell.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
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
  scroll: {
    padding: 16,
    gap: 16,
    maxWidth: 1500,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    maxWidth: 680,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight || '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  filterTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  filterBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    minWidth: 240,
  },
  dateInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  mapContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  mapContainerWide: {
    flexDirection: 'row',
  },
  mapCanvas: {
    flex: 2,
    height: 520,
    minHeight: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  emptyMapText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  sidebar: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clusterChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    minHeight: 42,
  },
  clusterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight || '#F1F5F9',
  },
  clusterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clusterTextActive: {
    color: COLORS.primary,
  },
  clusterCoords: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  detailPanel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailCoords: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  recordCard: {
    padding: 10,
    backgroundColor: COLORS.background || '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recordTitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  moreNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  errorBox: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
});
