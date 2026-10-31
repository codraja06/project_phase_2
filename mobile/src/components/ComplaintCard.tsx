import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Complaint } from '../types/complaint';
import { COLORS } from '../theme/colors';
import { BORDER_RADIUS } from '../theme/radius';
import { SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/date';
import { Card, CardContent } from './ui/Card';
import { TriageSummary } from './TriageSummary';

interface ComplaintCardProps {
  complaint: Complaint;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  showCitizenInfo?: boolean;
  index?: number;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  onPress,
  style,
  showCitizenInfo = false,
  index = 0,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  const formattedDate = formatDate(complaint.createdAt);

  const citizenObj = complaint.createdBy || complaint.citizenId;
  const citizenName =
    typeof citizenObj === 'object' && citizenObj
      ? (citizenObj as any).name || 'Citizen'
      : 'Citizen';

  const categoryLabel = complaint.customCategory
    ? `${complaint.customCategory} (Custom)`
    : (complaint.category || 'Issue')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

  const complaintCode = complaint.complaintId || `#CIV${complaint._id.slice(-5).toUpperCase()}`;

  const locationSummary = complaint.address
    ? complaint.address.split(',')[0].trim() || complaint.address
    : 'GPS Coordinates';

  return (
    <Card
      style={[
        styles.card,
        isHovered && isWeb && (styles.cardHovered as any),
        style,
      ]}
      onPress={onPress}
      interactive={true}
      animateEntry={false}
      delayMs={index * 50}
      {...({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      } as any)}
    >
      <CardContent style={{ padding: SPACING.lg }}>
        {/* ─── Top Header: Complaint ID & Status ─── */}
        <View style={styles.headerRow}>
          <View style={styles.codePillGroup}>
            <Text style={styles.complaintCodeText}>{complaintCode}</Text>
          </View>
          <StatusBadge status={complaint.status} size="sm" />
        </View>


        {/* ─── Main Content: Thumbnail + Info ─── */}
        <View style={styles.contentRow}>
          {/* Thumbnail with error fallback */}
          <View style={styles.thumbnailWrapper}>
            {complaint.imageUrl && !imgError ? (
              <Image
                source={{ uri: complaint.imageUrl }}
                accessibilityLabel="Citizen-submitted complaint photo"
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="image-outline" size={24} color={COLORS.slateMuted} />
              </View>
            )}
          </View>

          {/* Text Info */}
          <View style={styles.infoCol}>
            <Text style={styles.categoryTitle} numberOfLines={1}>
              {categoryLabel}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {complaint.description || complaint.title || 'Civic issue report submitted.'}
            </Text>
            {showCitizenInfo && (
              <View style={styles.citizenRow}>
                <Ionicons name="person-outline" size={14} color={COLORS.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.citizenName} numberOfLines={1}>
                  {citizenName}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', marginTop: 10 }}>View details →</Text>
        {/* Metadata */}
        <View style={styles.metaFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.slateMuted} style={styles.metaIcon} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.slateMuted} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {locationSummary}
            </Text>
          </View>
        </View>

      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.lg,
    padding: 0,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
      transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)' as any,
    } : {}),
  },
  cardHovered: {
    borderColor: COLORS.primarySurface,
    transform: [{ translateY: -2 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  codePillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  complaintCodeText: {
    ...TYPOGRAPHY.badge,
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundNeutral,
    marginRight: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundNeutral,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  categoryTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.xs,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
  },
  citizenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  citizenName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondaryDark,
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
  },
  metaIcon: {
    marginRight: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
  }
});
