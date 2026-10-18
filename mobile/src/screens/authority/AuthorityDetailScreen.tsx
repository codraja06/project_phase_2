import { MapLocationPicker } from '../../components/MapLocationPicker';
import { RequestError } from '../../components/RequestError';
import { TriageSummary } from '../../components/TriageSummary';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuthorityStackParamList } from '../../types/navigation';
import { authorityApi } from '../../api/authorityApi';
import { Complaint } from '../../types/complaint';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { DetectionOverlay } from '../../components/DetectionOverlay';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ComplaintStatusTimeline } from '../../components/ComplaintStatusTimeline';
import { Toast } from '../../components/Toast';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ComplaintManagementPanel } from '../../components/ComplaintManagementPanel';

type Props = NativeStackScreenProps<AuthorityStackParamList, 'AuthorityComplaintDetail'>;

export const AuthorityDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { complaintId } = route.params;
  const { isDesktop, isWide } = useBreakpoint();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);

  // Modals
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true); setLoadError('');
      const data = await authorityApi.getComplaintById(complaintId);
      setComplaint(data);
    } catch (error) {
      setLoadError((error as Error).message || 'Unable to load this incident.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [complaintId]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  const onRefresh = () => { setRefreshing(true); fetchDetail(); };

  const handleUpdateStatus = async (newStatus: 'In Progress' | 'Resolved') => {
    try {
      setActionLoading(true);
      const updated = await authorityApi.updateComplaintStatus(complaintId, newStatus);
      setComplaint(updated);
      setProgressModalVisible(false);
      setResolveModalVisible(false);
      setToast({ visible: true, message: `Complaint marked as ${newStatus}`, type: 'success' });
    } catch (error: any) {
      setProgressModalVisible(false);
      setResolveModalVisible(false);
      setToast({ visible: true, message: 'Unable to update status.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyComplaint = async () => {
    try {
      setActionLoading(true);
      const updated = await authorityApi.verifyComplaint(complaintId);
      setComplaint(updated);
      setToast({ visible: true, message: 'Incident verified.', type: 'success' });
    } catch (error: any) {
      setToast({ visible: true, message: error.message || 'Unable to verify.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };



  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.headerBar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incident Dossier</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: COLORS.backgroundNeutral }}>
          <RequestError message={loadError} onRetry={fetchDetail} />
        </View>
      </SafeAreaView>
    );
  }
  if (loading && !refreshing) return <LoadingSpinner message="Loading municipal dossier..." />;
  if (!complaint) return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.headerBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Dossier</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: COLORS.backgroundNeutral, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
        <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textPrimary, textAlign: 'center' }}>Complaint not found.</Text>
        <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs }}>This record may have been removed or is unavailable.</Text>
      </View>
    </SafeAreaView>
  );

  const normStatus = (complaint.status || '').toLowerCase();
  const isInProgress = normStatus === 'in progress' || normStatus === 'in_progress';
  const isResolved = normStatus === 'resolved';

  const userRef = complaint.createdBy || complaint.citizenId;
  const citizenName = typeof userRef === 'object' && userRef ? (userRef as any).name || 'Citizen' : 'Citizen';
  const citizenEmail = typeof userRef === 'object' && userRef ? (userRef as any).email : null;
  const citizenPhone = typeof userRef === 'object' && userRef ? (userRef as any).phone : null;

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const complaintCode = complaint.complaintId || `#CIV${complaint._id.slice(-5).toUpperCase()}`;
  const isVerified = Boolean(complaint.verified);
  const priority = complaint.priority || 'medium';

  const formatCategory = (cat?: string) => {
    if (!cat) return 'Unspecified';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const aiLabel = complaint.aiClass ? formatCategory(complaint.aiClass) : complaint.boundingBoxes && complaint.boundingBoxes.length > 0 ? formatCategory((complaint.boundingBoxes[0] as any).className || (complaint.boundingBoxes[0] as any).label) : 'No hazard identified';
  const citizenCategoryLabel = complaint.customCategory ? `${complaint.customCategory} (Custom)` : formatCategory(complaint.category);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Dossier</Text>
        <Badge label={complaint.status.toUpperCase()} variant={isResolved ? 'success' : isInProgress ? 'default' : 'warning'} />
      </Animated.View>

      <ScrollView style={styles.container} contentContainerStyle={isWide ? styles.desktopScrollContent : styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
        {isWide ? (
          <View style={styles.desktopContainer}>
            {/* Left Column */}
            <View style={styles.desktopLeftCol}>
              <View style={{ marginBottom: 16 }}><MapLocationPicker latitude={complaint.latitude} longitude={complaint.longitude} address={complaint.address} interactive={false} showCard={false} height={220} /></View>
              <Animated.View entering={ZoomIn.delay(100)}>
                <DetectionOverlay imageUri={complaint.imageUrl} detections={complaint.boundingBoxes || []} confidence={complaint.aiConfidence} height={380} />
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200)}>
                <Card style={{ marginTop: SPACING.lg }}>
                  <CardContent>
                    <View style={styles.metaHeaderRow}><Ionicons name="person-circle" size={20} color={COLORS.secondary} /><Text style={styles.metaCardTitle}> Reporting Citizen</Text></View>
                    <Text style={styles.citizenNameText}>{citizenName}</Text>
                    {citizenEmail && <Text style={styles.citizenEmailText}>{citizenEmail}</Text>}
                    {citizenPhone && <Text style={styles.citizenPhoneText}>{citizenPhone}</Text>}
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300)}>
                <Card style={{ marginTop: SPACING.lg }}>
                  <CardContent>
                    <View style={styles.metaHeaderRow}><Ionicons name="location" size={20} color={COLORS.primary} /><Text style={styles.metaCardTitle}> Geographic Verification</Text></View>
                    <Text style={styles.locationText}>{complaint.address || 'Address registered with device GPS sensor'}</Text>
                    {Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude) && <Text style={styles.coordsText}>Lat: {complaint.latitude.toFixed(5)}, Long: {complaint.longitude.toFixed(5)}</Text>}
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(400)}>
                <Card style={{ marginTop: SPACING.lg }}>
                  <CardContent>
                    <View style={styles.metaHeaderRow}><Ionicons name="git-network-outline" size={18} color={COLORS.textSecondary} /><Text style={styles.metaCardTitle}> Resolution Progress</Text></View>
                    <ComplaintStatusTimeline status={complaint.status} createdAt={complaint.createdAt} updatedAt={complaint.updatedAt} resolvedAt={complaint.resolvedAt} />
                  </CardContent>
                </Card>
              </Animated.View>
            </View>

            {/* Right Column */}
            <View style={styles.desktopRightCol}>
              <Animated.View entering={FadeInUp.delay(100)}>
                <View style={styles.topBadgeRow}>
                  <Text style={styles.complaintCode}>{complaintCode}</Text>
                  <Badge label={`${priority.toUpperCase()} PRIORITY`} variant={(priority === 'urgent' || priority === 'high') ? 'destructive' : 'secondary'} />
                  <Badge label={isVerified ? 'VERIFIED' : 'UNVERIFIED'} variant={isVerified ? 'success' : 'warning'} icon={<Ionicons name={isVerified ? "shield-checkmark" : "shield-outline"} size={10} color="#FFF" />} />
                  <Text style={styles.dateText}>Reported {formattedDate}</Text>
                </View>

                <Text style={styles.title}>{complaint.title}</Text>
                <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} priority={complaint.priority} score={complaint.priorityScore} priorityMetadata={complaint.priorityMetadata} />
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200)}>
                <Card style={{ marginBottom: SPACING.lg, backgroundColor: COLORS.surface }}>
                  <CardContent style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compareLabel}>AI PREDICTED</Text>
                      <Text style={styles.compareVal}>{aiLabel}</Text>
                      <Text style={styles.compareSub}>{complaint.aiConfidence ? `${Math.round(complaint.aiConfidence * 100)}% Confidence` : 'YOLOv8'}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compareLabel}>CITIZEN REPORTED</Text>
                      <Text style={styles.compareVal}>{citizenCategoryLabel}</Text>
                      <Text style={styles.compareSub}>{complaint.customCategory ? 'Custom' : 'Standard'}</Text>
                    </View>
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300)} style={styles.descBlock}>
                <Text style={styles.descLabel}>NARRATIVE</Text>
                <Text style={styles.descriptionText}>{complaint.description || 'No description provided.'}</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(400)} style={styles.actionsSection}>
                <Text style={styles.actionsSectionHeader}>MUNICIPAL ACTION PIPELINE</Text>
                {!isVerified && <Button title="Verify Incident" onPress={handleVerifyComplaint} variant="secondary" size="lg" loading={actionLoading} style={styles.actionBtn} />}
                {!isInProgress && !isResolved && <Button title="Mark In Progress" onPress={() => setProgressModalVisible(true)} variant="default" size="lg" loading={actionLoading} style={styles.actionBtn} />}
                {isInProgress && <Button title="Mark Resolved" onPress={() => setResolveModalVisible(true)} variant="default" size="lg" loading={actionLoading} disabled={!!complaint.completionImageUrl && complaint.completionReview !== 'accepted'} style={styles.actionBtn} />}
                {isResolved && <Button title="Resolved ✓" onPress={() => {}} variant="outline" size="lg" disabled style={styles.actionBtn} />}
              </Animated.View>
            </View>
          </View>
        ) : (
          <View style={styles.mainWrapper}>
            <Animated.View entering={ZoomIn.delay(100)}>
              <DetectionOverlay imageUri={complaint.imageUrl} detections={complaint.boundingBoxes || []} confidence={complaint.aiConfidence} height={270} />
            </Animated.View>

            <View style={styles.mobileContentPadding}>
              <Animated.View entering={FadeInUp.delay(200)}>
                <View style={styles.topBadgeRowMobile}>
                  <Text style={styles.complaintCode}>{complaintCode}</Text>
                  <Badge label={`${priority.toUpperCase()}`} variant={(priority === 'urgent' || priority === 'high') ? 'destructive' : 'secondary'} />
                  <Badge label={isVerified ? 'VERIFIED' : 'UNVERIFIED'} variant={isVerified ? 'success' : 'warning'} />
                </View>

                <MapLocationPicker latitude={complaint.latitude} longitude={complaint.longitude} address={complaint.address} interactive={false} showCard={false} height={220} />
                <Text style={styles.title}>{complaint.title}</Text>
                <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} priority={complaint.priority} score={complaint.priorityScore} priorityMetadata={complaint.priorityMetadata} />
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300)}>
                <Card style={{ marginBottom: SPACING.lg, backgroundColor: COLORS.surface }}>
                  <CardContent style={{ flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compareLabel}>AI PREDICTED</Text>
                      <Text style={styles.compareVal}>{aiLabel}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.sm }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compareLabel}>CITIZEN REPORTED</Text>
                      <Text style={styles.compareVal}>{citizenCategoryLabel}</Text>
                    </View>
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(400)}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={COLORS.secondary} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
                  <View>
                    <Text style={styles.infoLabel}>Citizen Contact</Text>
                    <Text style={styles.infoValue}>{citizenName}</Text>
                    {citizenEmail && <Text style={styles.infoSubValue}>{citizenEmail}</Text>}
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
                  <View>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{complaint.address || 'GPS coordinates logged'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue} numberOfLines={expandedDesc ? undefined : 3}>{complaint.description || 'No description provided.'}</Text>
                    {complaint.description && complaint.description.length > 80 && (
                      <TouchableOpacity onPress={() => setExpandedDesc(!expandedDesc)}><Text style={styles.readMoreText}>{expandedDesc ? 'Show Less' : 'Read More'}</Text></TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(500)}>
                <Card style={{ marginTop: SPACING.lg }}>
                  <CardContent>
                    <Text style={styles.metaCardTitle}>Resolution Pipeline</Text>
                    <ComplaintStatusTimeline status={complaint.status} createdAt={complaint.createdAt} updatedAt={complaint.updatedAt} resolvedAt={complaint.resolvedAt} />
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(600)} style={styles.actionsSection}>
                {!isVerified && <Button title="Verify Incident" onPress={handleVerifyComplaint} variant="secondary" size="lg" loading={actionLoading} style={styles.actionBtn} />}
                {!isInProgress && !isResolved && <Button title="Mark In Progress" onPress={() => setProgressModalVisible(true)} variant="default" size="lg" loading={actionLoading} style={styles.actionBtn} />}
                {isInProgress && <Button title="Mark Resolved" onPress={() => setResolveModalVisible(true)} variant="default" size="lg" loading={actionLoading} disabled={!!complaint.completionImageUrl && complaint.completionReview !== 'accepted'} style={styles.actionBtn} />}
                {isResolved && <Button title="Resolved ✓" onPress={() => {}} variant="outline" size="lg" disabled style={styles.actionBtn} />}
              </Animated.View>
            </View>
          </View>
        )}
        <View style={{ width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: isWide ? 0 : SPACING.lg, marginTop: SPACING.lg }}>
          <ComplaintManagementPanel complaint={complaint} onChange={setComplaint} />
        </View>
      </ScrollView>

      <ConfirmationDialog visible={progressModalVisible} title="Mark In Progress" message={`Dispatch municipal team to inspect and resolve '${complaint.title}'?`} confirmText="Confirm Dispatch" confirmVariant="info" loading={actionLoading} onConfirm={() => handleUpdateStatus('In Progress')} onCancel={() => setProgressModalVisible(false)} />
      <ConfirmationDialog visible={resolveModalVisible} title="Certify Resolution" message={`Confirm that work is completed and civic issue '${complaint.title}' is remediated?`} confirmText="Confirm Resolution" confirmVariant="primary" loading={actionLoading} onConfirm={() => handleUpdateStatus('Resolved')} onCancel={() => setResolveModalVisible(false)} />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: 10, paddingBottom: 14, backgroundColor: '#0F172A', borderBottomWidth: 2, borderBottomColor: COLORS.gold },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginRight: SPACING.md },
  headerTitle: { ...TYPOGRAPHY.h3, color: '#FFFFFF', flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.backgroundNeutral },
  scrollContent: { paddingBottom: SPACING['5xl'] },
  desktopScrollContent: { padding: SPACING['5xl'], maxWidth: 1440, alignSelf: 'center', width: '100%' },
  desktopContainer: { flexDirection: 'row', gap: SPACING['4xl'] },
  desktopLeftCol: { flex: 1 },
  desktopRightCol: { flex: 1.2 },
  mainWrapper: { width: '100%', alignSelf: 'center' },
  mobileContentPadding: { padding: SPACING.lg },
  metaHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  metaCardTitle: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.textSecondary },
  citizenNameText: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  citizenEmailText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 4 },
  citizenPhoneText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  locationText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, lineHeight: 20 },
  coordsText: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 4 },
  topBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  topBadgeRowMobile: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md, marginTop: SPACING.md, flexWrap: 'wrap' },
  complaintCode: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  dateText: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginLeft: 'auto' },
  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: SPACING.xl, letterSpacing: -0.5 },
  compareLabel: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
  compareVal: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, marginBottom: 2 },
  compareSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  descBlock: { marginBottom: SPACING['3xl'] },
  descLabel: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  descriptionText: { ...TYPOGRAPHY.bodySmall, lineHeight: 24, color: COLORS.textPrimary },
  infoRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  infoLabel: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textMuted, marginBottom: 2 },
  infoValue: { ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '500' },
  infoSubValue: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  readMoreText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  actionsSection: { marginTop: SPACING['3xl'], padding: SPACING.xl, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, borderTopWidth: 3, borderTopColor: COLORS.gold, ...SHADOWS.sm },
  actionsSectionHeader: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary, marginBottom: SPACING.lg, textAlign: 'center' },
  actionBtn: { marginBottom: SPACING.md },
});
