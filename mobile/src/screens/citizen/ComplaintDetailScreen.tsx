import { MapLocationPicker } from '../../components/MapLocationPicker';
import { RequestError } from '../../components/RequestError';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CitizenStackParamList } from '../../types/navigation';
import { complaintApi } from '../../api/complaintApi';
import { Complaint } from '../../types/complaint';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { DetectionOverlay } from '../../components/DetectionOverlay';
import { Timeline } from '../../components/Timeline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { TriageSummary } from '../../components/TriageSummary';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { formatDate } from '../../utils/date';

type Props = NativeStackScreenProps<CitizenStackParamList, 'ComplaintDetail'>;

export const ComplaintDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { complaintId } = route.params;
  const { isDesktop, isWide } = useBreakpoint();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true); setLoadError('');
      const data = await complaintApi.getComplaintById(complaintId);
      setComplaint(data);
    } catch (error) {
      setLoadError((error as Error).message || 'Unable to load this incident.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [complaintId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complaint Details</Text>
        </View>
        <RequestError message={loadError} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }
  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching live complaint dossier..." />;
  }

  if (!complaint) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complaint Details</Text>
        </View>
        <Animated.View entering={FadeIn} style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Complaint record not found</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const categoryLabel = complaint.customCategory
    ? `${complaint.customCategory} (Custom)`
    : (complaint.category || 'Issue')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

  const formattedDate = formatDate(complaint.createdAt, true);
  const complaintCode = complaint.complaintId || `#CIV${complaint._id.slice(-5).toUpperCase()}`;
  const priority = complaint.priority || 'medium';
  const isHighPriority = priority === 'urgent' || priority === 'high';
  const isVerified = Boolean(complaint.verified);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Screen Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerBar}>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Dossier</Text>
        <View style={styles.headerRightBadges}>
          <StatusBadge status={complaint.status} size="sm" />
        </View>
      </Animated.View>

      <ScrollView
        {...(Platform.OS === 'web' ? { tabIndex: 0 as const } : {})}
        accessibilityLabel="Complaint details content"
        style={styles.container}
        contentContainerStyle={isWide ? styles.desktopScrollContent : styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isWide ? (
          /* Desktop/Tablet Two-Column Layout */
          <View style={styles.desktopContainer}>
            {/* Left Column: Visual Media & Geographic Pin */}
            <View style={styles.desktopLeftCol}>
              <View style={{ marginBottom: 16 }}><MapLocationPicker latitude={complaint.latitude} longitude={complaint.longitude} address={complaint.address} interactive={false} showCard={false} height={220} /></View>
              <Animated.View entering={FadeInUp.delay(100)}>
                <DetectionOverlay
                  imageUri={complaint.imageUrl}
                  detections={complaint.boundingBoxes || []}
                  confidence={complaint.aiConfidence}
                  height={380}
                />
              </Animated.View>

              {/* Location Card */}
              <Animated.View entering={FadeInUp.delay(200)} style={styles.metaCard}>
                <View style={styles.locationHeaderRow}>
                  <Ionicons name="location" size={20} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.metaCardTitle}>Incident Location</Text>
                </View>
                <Text style={styles.locationText}>{complaint.address || 'Address logged via device GPS sensor'}</Text>
                {Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude) && (
                  <Text style={styles.gpsCoordsText}>
                    GPS: {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                  </Text>
                )}
              </Animated.View>
            </View>

            {/* Right Column: Information Dossier & Status Timeline */}
            <View style={styles.desktopRightCol}>
              <View style={styles.infoCard}>
                <Animated.View entering={FadeInUp.delay(100)} style={styles.codeDateRow}>
                  <Text style={styles.complaintCode}>{complaintCode}</Text>

                  {/* Priority Pill */}
                  <View style={[styles.priorityPill, isHighPriority ? styles.priorityHigh : styles.priorityNormal]}>
                    <Ionicons name="flame" size={11} color={isHighPriority ? COLORS.error : COLORS.primaryDark} style={{ marginRight: 3 }} />
                    <Text style={[styles.priorityPillText, isHighPriority ? styles.priorityHighText : styles.priorityNormalText]}>
                      {priority.toUpperCase()} PRIORITY
                    </Text>
                  </View>

                  {/* Verification Pill */}
                  <View style={[styles.verifyPill, isVerified ? styles.verifiedBg : styles.unverifiedBg]}>
                    <Ionicons
                      name={isVerified ? "shield-checkmark" : "shield-outline"}
                      size={11}
                      color={isVerified ? COLORS.successDark : COLORS.pendingDark}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.verifyPillText, { color: isVerified ? COLORS.successDark : COLORS.pendingDark }]}>
                      {isVerified ? 'VERIFIED' : 'PENDING VERIFICATION'}
                    </Text>
                  </View>

                  <Text style={styles.dateText}>{formattedDate}</Text>
                </Animated.View>

                <Animated.Text entering={FadeInUp.delay(200)} style={styles.title}>{complaint.title}</Animated.Text>
                <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} />

                {/* Tags Row */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.tagRow}>
                  <View style={styles.categoryTag}>
                    <Ionicons name="construct-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={styles.categoryTagText}>{categoryLabel}</Text>
                  </View>

                  {complaint.aiConfidence > 0 && (
                    <View style={styles.confidenceTag}>
                      <Ionicons name="sparkles" size={13} color={COLORS.primaryDark} style={{ marginRight: 5 }} />
                      <Text style={styles.confidenceTagText}>
                        AI Confidence: {Math.round(complaint.aiConfidence * 100)}%
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInUp.delay(400)} style={styles.descBlock}>
                  <Text style={styles.descLabel}>CITIZEN REPORT DETAILS</Text>
                  <Text style={styles.descriptionText}>
                    {complaint.description || 'No additional details provided with this report.'}
                  </Text>
                </Animated.View>

                {/* Live Status Timeline */}
                <Animated.View entering={FadeInUp.delay(500)}>
                  <Timeline
                    status={complaint.status}
                    verified={complaint.verified}
                    createdAt={complaint.createdAt}
                    updatedAt={complaint.updatedAt}
                    resolvedAt={complaint.resolvedAt}
                  />
                </Animated.View>
              </View>
            </View>
          </View>
        ) : (
          /* Mobile Stacked Layout */
          <View style={styles.mainWrapper}>
            {/* Issue Photo & YOLO Bounding Box Overlay */}
            <Animated.View entering={FadeInDown.delay(100)}>
              <DetectionOverlay
                imageUri={complaint.imageUrl}
                detections={complaint.boundingBoxes || []}
                confidence={complaint.aiConfidence}
                height={270}
              />
            </Animated.View>

            {/* Details Card */}
            <View style={styles.infoCard}>
              <Animated.View entering={FadeInUp.delay(200)} style={styles.codeDateRowMobile}>
                <Text style={styles.complaintCode}>{complaintCode}</Text>

                {/* Priority Pill */}
                <View style={[styles.priorityPill, isHighPriority ? styles.priorityHigh : styles.priorityNormal]}>
                  <Ionicons name="flame" size={10} color={isHighPriority ? COLORS.error : COLORS.primaryDark} style={{ marginRight: 3 }} />
                  <Text style={[styles.priorityPillText, isHighPriority ? styles.priorityHighText : styles.priorityNormalText]}>
                    {priority.toUpperCase()}
                  </Text>
                </View>

                {/* Verification Pill */}
                <View style={[styles.verifyPill, isVerified ? styles.verifiedBg : styles.unverifiedBg]}>
                  <Ionicons
                    name={isVerified ? "shield-checkmark" : "shield-outline"}
                    size={10}
                    color={isVerified ? COLORS.successDark : COLORS.pendingDark}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.verifyPillText, { color: isVerified ? COLORS.successDark : COLORS.pendingDark }]}>
                    {isVerified ? 'VERIFIED' : 'PENDING'}
                  </Text>
                </View>

                <Text style={styles.dateText}>{formattedDate}</Text>
              </Animated.View>

              <MapLocationPicker latitude={complaint.latitude} longitude={complaint.longitude} address={complaint.address} interactive={false} showCard={false} height={220} />
              <Animated.Text entering={FadeInUp.delay(300)} style={styles.title}>{complaint.title}</Animated.Text>
              <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} />

              {/* Tags */}
              <Animated.View entering={FadeInUp.delay(400)} style={styles.tagRow}>
                <View style={styles.categoryTag}>
                  <Ionicons name="construct-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.categoryTagText}>{categoryLabel}</Text>
                </View>

                {complaint.aiConfidence > 0 && (
                  <View style={styles.confidenceTag}>
                    <Ionicons name="sparkles" size={12} color={COLORS.primaryDark} style={{ marginRight: 4 }} />
                    <Text style={styles.confidenceTagText}>
                      {Math.round(complaint.aiConfidence * 100)}% Confidence
                    </Text>
                  </View>
                )}
              </Animated.View>

              {/* Location Row */}
              <Animated.View entering={FadeInUp.delay(500)} style={styles.locationRow}>
                <Ionicons name="location" size={18} color={COLORS.primary} style={{ marginRight: SPACING.xs, marginTop: 1 }} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {complaint.address || 'Address logged with GPS'}
                </Text>
              </Animated.View>

              {/* Description */}
              <Animated.View entering={FadeInUp.delay(600)} style={styles.descBlock}>
                <Text
                  style={styles.descriptionText}
                  numberOfLines={expandedDesc ? undefined : 3}
                >
                  {complaint.description || 'No description provided by citizen.'}
                </Text>
                {complaint.description && complaint.description.length > 80 && (
                  <TouchableOpacity onPress={() => setExpandedDesc(!expandedDesc)} style={styles.readMoreBtn}>
                    <Text style={styles.readMoreText}>
                      {expandedDesc ? 'Show Less' : 'Read More Details'}
                    </Text>
                  </TouchableOpacity>
                )}
              </Animated.View>

              {/* Live Status Timeline */}
              <Animated.View entering={FadeInUp.delay(700)}>
                <Timeline
                  status={complaint.status}
                  verified={complaint.verified}
                  createdAt={complaint.createdAt}
                  updatedAt={complaint.updatedAt}
                  resolvedAt={complaint.resolvedAt}
                />
              </Animated.View>
            </View>
          </View>
        )}
        <View style={{ maxWidth: 1440, width: '100%', alignSelf: 'center', padding: 16, gap: 8, backgroundColor: COLORS.surface, marginTop: 12, borderRadius: 10 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' }}>Routing and repair</Text>
          <Text style={{ color: COLORS.textSecondary }}>Assigned department: {complaint.assignedDepartment || 'Awaiting assignment'}</Text>
          {!!complaint.duplicateReference && <Text style={{ color: COLORS.textSecondary }}>Authority linked this report to earlier complaint {complaint.duplicateReference}. Your report remains in the system.</Text>}
          {!!complaint.completionImageUrl && <>
            <Text style={{ color: COLORS.textSecondary }}>Repair photo: {complaint.completionReview || 'awaiting review'}. A photo alone does not confirm repair.</Text>
            <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 12 }}>
              <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary }}>Original report</Text><Image source={{ uri: complaint.imageUrl }} accessibilityLabel="Original complaint photo" style={{ height: 190, width: '100%', resizeMode: 'contain' }} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary }}>Submitted completion</Text><Image source={{ uri: complaint.completionImageUrl }} accessibilityLabel="Submitted repair completion photo" style={{ height: 190, width: '100%', resizeMode: 'contain' }} /></View>
            </View>
          </>}
          {complaint.statusHistory?.length ? complaint.statusHistory.map((event, index) => <Text key={`${index}-${event.at}`} style={{ color: COLORS.textSecondary }}>{event.status} · {new Date(event.at).toLocaleString()}</Text>) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background},
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.background},
  headerRightBadges: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs},
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background},
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING['5xl']},
  desktopScrollContent: {
    padding: SPACING['4xl'],
    paddingBottom: SPACING['6xl']},
  desktopContainer: {
    flexDirection: 'row',
    gap: SPACING['4xl'],
    alignItems: 'flex-start',
    maxWidth: 1440,
    alignSelf: 'center',
    width: '100%'},
  desktopLeftCol: {
    flex: 1.1},
  desktopRightCol: {
    flex: 1.2},
  metaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight},
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs},
  metaCardTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary},
  locationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary},
  gpsCoordsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xs},
  mainWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center'},
  infoCard: {
    marginTop: SPACING.lg},
  codeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md},
  codeDateRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm},
  complaintCode: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BORDER_RADIUS.xs},
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1},
  priorityHigh: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder},
  priorityNormal: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border},
  priorityPillText: {
    ...TYPOGRAPHY.overline},
  priorityHighText: {
    color: COLORS.error},
  priorityNormalText: {
    color: COLORS.primaryDark},
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1},
  verifiedBg: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder},
  unverifiedBg: {
    backgroundColor: COLORS.pendingLight,
    borderColor: COLORS.pendingBorder},
  verifyPillText: {
    ...TYPOGRAPHY.overline},
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: 'auto'},
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md},
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md},
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md},
  categoryTagText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textPrimary},
  confidenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.borderMaroon,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md},
  confidenceTagText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.primary},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight},
  descBlock: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg},
  descLabel: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs},
  descriptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary},
  readMoreBtn: {
    marginTop: SPACING.xs},
  readMoreText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '700'},
  errorContainer: {
    padding: SPACING['5xl'],
    alignItems: 'center',
    justifyContent: 'center'},
  errorText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.error,
    marginTop: SPACING.md}});
