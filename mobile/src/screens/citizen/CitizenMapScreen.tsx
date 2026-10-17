import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { complaintApi } from '../../api/complaintApi';
import { Complaint } from '../../types/complaint';
import { MapSurface } from '../../components/MapSurface';
import { RequestError } from '../../components/RequestError';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { COLORS } from '../../theme/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Button } from '../../components/ui/Button';

export const CitizenMapScreen = ({ navigation }: any) => {
  const { isWide } = useBreakpoint();
  const [reports, setReports] = useState<Complaint[]>([]), [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = async () => {
    try { setLoading(true); setError(''); const response = await complaintApi.getMyComplaints();
      const valid = response.complaints.filter(c => Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180);
      setReports(valid); setSelected(valid[0]?._id || '');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { void load(); }, []));
  if (error) return <RequestError message={error} onRetry={load} />;
  if (loading) return <LoadingSpinner message="Loading your report locations…" />;
  const current = reports.find(c => c._id === selected);
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}><View><Text style={styles.title}>Your report map</Text><Text style={styles.subtitle}>{reports.length} reports with valid coordinates</Text></View><Button title="Back" variant="outline" onPress={() => navigation.navigate('CitizenDashboard')} /></View>
    {!current ? <View style={styles.empty}><Text style={styles.title}>No report locations yet</Text><Text style={styles.subtitle}>Submitted reports with valid locations will appear here.</Text><Button title="Report an issue" onPress={() => navigation.navigate('ReportIssue')} /></View> :
      <View style={[styles.body, isWide && { flexDirection: 'row' }]}>
        <View style={styles.map}><MapSurface latitude={current.latitude} longitude={current.longitude} interactive pins={reports.map(c => ({ id: c._id, latitude: c.latitude, longitude: c.longitude, title: c.title, address: c.address }))} onSelectPin={setSelected} /></View>
        <ScrollView style={isWide ? styles.listWide : styles.list} contentContainerStyle={{ padding: 12, gap: 10 }}>
          {reports.map(c => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View location for ${c.complaintId}`} key={c._id} onPress={() => setSelected(c._id)} style={[styles.item, c._id === selected && { borderColor: COLORS.primary }]}>
            <Text style={styles.itemTitle}>{c.title}</Text><Text style={styles.subtitle}>{c.address}</Text><StatusBadge status={c.status} size="sm" />
            {c._id === selected && <Button title="View complaint details" variant="outline" size="sm" onPress={() => navigation.navigate('ComplaintDetail', { complaintId: c._id })} />}
          </TouchableOpacity>)}
        </ScrollView>
      </View>}
  </SafeAreaView>;
};
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', backgroundColor: COLORS.surface, borderTopWidth: 4, borderTopColor: COLORS.primary, borderBottomWidth: 1, borderBottomColor: COLORS.secondarySurface }, title: { fontSize: 21, color: COLORS.textPrimary, fontWeight: '700' }, subtitle: { fontSize: 12, lineHeight: 19, color: COLORS.textSecondary },
  body: { flex: 1, minHeight: 0, gap: 12, padding: 12 }, map: { flex: 1, minHeight: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.backgroundNeutral },
  listWide: { width: 300 }, list: { flex: 1 }, item: { padding: 14, gap: 9, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight }, itemTitle: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }, empty: { padding: 24, gap: 16 },
});
