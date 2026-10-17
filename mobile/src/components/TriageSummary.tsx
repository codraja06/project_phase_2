import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SeverityAssessment } from '../types/ai';
import { Badge } from './ui/Badge';
import { COLORS } from '../theme/colors';

export const TriageSummary = ({ severity, priority, score, priorityMetadata, compact = false }: {
  severity?: SeverityAssessment; priority?: string; score?: number;
  priorityMetadata?: { severityScore: number; categoryScore: number; ageScore: number; reviewRequired?: boolean; resolved?: boolean };
  compact?: boolean;
}) => (
  <View style={styles.container}>
    <View style={styles.badges}>
      <Badge label={severity?.level ? `${severity.level} severity · experimental` : 'Severity unavailable · review needed'}
        variant={severity?.level === 'High' ? 'destructive' : severity?.level === 'Medium' ? 'warning' : 'secondary'}
        style={styles.badge} textStyle={styles.badgeText} />
      {priority && <Badge label={`${priority === 'urgent' ? 'High' : priority[0].toUpperCase() + priority.slice(1)} Priority${score === undefined ? '' : ` · ${score}/100`}`}
        variant={priority === 'high' || priority === 'urgent' ? 'destructive' : 'secondary'} />}
    </View>
    {!compact && <Text style={styles.note}>{severity?.reason || 'No severity prediction is available for this report. Authority review required.'}</Text>}
    {!compact && priorityMetadata && <Text style={styles.note}>{priorityMetadata.resolved ? 'Resolved reports leave the attention queue.' :
      `Priority factors: severity ${priorityMetadata.severityScore}, category ${priorityMetadata.categoryScore}, unresolved age ${priorityMetadata.ageScore}${priorityMetadata.reviewRequired ? '. Severity needs human review.' : '.'}`}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { marginVertical: 8, maxWidth: '100%' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexShrink: 1 },
  badgeText: { flexShrink: 1 },
  note: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 },
});
