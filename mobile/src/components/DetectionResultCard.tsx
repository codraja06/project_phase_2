import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { DetectionResult } from '../types/ai';

interface DetectionResultCardProps {
  detections: DetectionResult[];
  confidence: number;
  detectedClass?: string;
}

export const DetectionResultCard: React.FC<DetectionResultCardProps> = ({
  detections,
  confidence,
  detectedClass,
}) => {
  const hasDetections = detections && detections.length > 0;
  const topClass = detectedClass || (hasDetections ? detections[0].category : 'No hazard identified');
  const formattedTitle = topClass.replace(/_/g, ' ').toUpperCase();
  const confidencePercent = Math.round(confidence * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={hasDetections ? 'sparkles' : 'help-circle-outline'}
            size={16}
            color={hasDetections ? COLORS.secondaryDark : COLORS.textMuted}
          />
        </View>
        <Text style={styles.headerTitle}>AI Defect Inspection</Text>
        <View style={[styles.statusBadge, hasDetections ? styles.statusBadgeSuccess : styles.statusBadgeNeutral]}>
          <Text style={[styles.statusBadgeText, hasDetections ? styles.statusTextSuccess : styles.statusTextNeutral]}>
            {hasDetections ? 'MODEL CONFIRMED' : 'MANUAL REVIEW'}
          </Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.item}>
          <Text style={styles.itemLabel}>CLASSIFIED HAZARD</Text>
          <Text style={styles.itemValue}>{formattedTitle}</Text>
        </View>

        <View style={styles.itemRight}>
          <Text style={styles.itemLabel}>AI CONFIDENCE</Text>
          <View style={styles.confRow}>
            <Text style={styles.confValue}>{confidencePercent}%</Text>
            {hasDetections && (
              <View style={styles.confBarBg}>
                <View style={[styles.confBarFill, { width: `${Math.min(confidencePercent, 100)}%` }]} />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEFCE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeSuccess: {
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  statusBadgeNeutral: {
    backgroundColor: COLORS.backgroundNeutral,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextSuccess: {
    color: COLORS.secondaryDark,
  },
  statusTextNeutral: {
    color: COLORS.textMuted,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    flex: 1.3,
  },
  itemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  confRow: {
    alignItems: 'flex-end',
  },
  confValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  confBarBg: {
    width: 70,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    marginTop: 4,
    overflow: 'hidden',
  },
  confBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
});
