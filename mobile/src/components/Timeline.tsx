import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComplaintStatus } from '../types/complaint';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { formatDate } from '../utils/date';

interface TimelineProps {
  status: ComplaintStatus;
  verified?: boolean;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({
  status,
  verified = false,
  createdAt,
  updatedAt,
  resolvedAt,
}) => {
  const normStatus = (status || '').toString().toLowerCase().trim();

  const isSubmittedDone = true;
  const isVerifiedDone = Boolean(verified);
  const isInProgressDone = normStatus === 'in progress' || normStatus === 'in_progress' || normStatus === 'resolved';
  const isResolvedDone = normStatus === 'resolved';

  const steps = [
    {
      key: 'submitted',
      title: 'Complaint Submitted',
      subtitle: 'Recorded into municipal dispatch queue',
      isDone: isSubmittedDone,
      isActive: normStatus === 'pending' && !isVerifiedDone,
      timestamp: createdAt,
    },
    {
      key: 'verified',
      title: isVerifiedDone ? 'Verified by Municipal Authority' : 'Pending Authority Verification',
      subtitle: isVerifiedDone
        ? 'Verification recorded by an officer'
        : 'Awaiting triage and site validation',
      isDone: isVerifiedDone,
      isActive: normStatus === 'pending' && isVerifiedDone,
      timestamp: null,
    },
    {
      key: 'inProgress',
      title: 'Remediation In Progress',
      subtitle: 'Current complaint status: in progress',
      isDone: isResolvedDone,
      isActive: normStatus === 'in progress' || normStatus === 'in_progress',
      timestamp: null,
    },
    {
      key: 'resolved',
      title: isResolvedDone ? 'Remediation Resolved ✓' : 'Remediation Resolved',
      subtitle: isResolvedDone
        ? 'Complaint status recorded as resolved'
        : 'Remediation scheduled upon inspection',
      isDone: isResolvedDone,
      isActive: isResolvedDone,
      timestamp: resolvedAt || null,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Resolution Progress Pipeline</Text>
      {normStatus === 'rejected' && <Text style={{ color: COLORS.error, marginBottom: 12 }}>This complaint was rejected.</Text>}

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const formattedTime = step.timestamp ? formatDate(step.timestamp, true) : null;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Left Indicator Column */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  step.isDone && styles.circleDone,
                  step.isActive && !step.isDone && styles.circleActive,
                  !step.isDone && !step.isActive && styles.circleUpcoming,
                ]}
              >
                {step.isDone ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : step.isActive ? (
                  <View style={styles.innerDotActive} />
                ) : (
                  <View style={styles.innerDot} />
                )}
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    step.isDone && (steps[index + 1].isDone || steps[index + 1].isActive)
                      ? styles.connectorActive
                      : styles.connectorInactive,
                  ]}
                />
              )}
            </View>

            {/* Right Text Content */}
            <View style={[styles.contentCol, !isLast && styles.contentSpacing]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.stepTitle,
                    step.isDone && styles.stepTitleDone,
                    step.isActive && styles.stepTitleActive,
                  ]}
                >
                  {step.title}
                </Text>
                {step.isActive && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

              {formattedTime && (
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.timestampText}>{formattedTime}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginVertical: 14,
    ...SHADOWS.card,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  stepRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  circleDone: {
    backgroundColor: COLORS.successDark,
  },
  circleActive: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  circleUpcoming: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  innerDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 3,
  },
  connectorActive: {
    backgroundColor: COLORS.successDark,
  },
  connectorInactive: {
    backgroundColor: COLORS.borderLight,
  },
  contentCol: {
    flex: 1,
  },
  contentSpacing: {
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  stepTitleDone: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  stepTitleActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  stepSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timestampText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
