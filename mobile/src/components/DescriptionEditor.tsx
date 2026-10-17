import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface DescriptionEditorProps {
  category: string;
  customCategory?: string;
  description: string;
  onChangeDescription: (text: string) => void;
  address?: string;
  error?: string;
  generatedDescription?: string;
}

export const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
  description,
  onChangeDescription,
  error,
  generatedDescription,
}) => {
  const handleResetToTemplate = () => {
    if (generatedDescription) onChangeDescription(generatedDescription);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelWrapper}>
          <Text style={styles.label}>Complaint Description</Text>
          <View style={styles.autoBadge}>
            <Ionicons name="sparkles" size={11} color={COLORS.secondaryDark} style={{ marginRight: 3 }} />
            <Text style={styles.autoBadgeText}>{generatedDescription ? 'AI detection draft' : 'Manual entry'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleResetToTemplate}
          disabled={!generatedDescription}
          accessibilityRole="button"
          accessibilityLabel="Restore AI description"
          style={styles.resetBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.resetBtnText}>{generatedDescription ? 'Restore draft' : ''}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        {generatedDescription ? 'Review and edit the AI detection draft before submitting. Image coverage does not measure physical damage.' : 'AI description unavailable. Enter the condition you observed to continue.'}
      </Text>

      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
        <TextInput
          style={styles.textArea}
          accessibilityLabel="Complaint description"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Describe the issue, its location, and the action requested."
          placeholderTextColor={COLORS.textMuted}
          textAlignVertical="top"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondaryDark,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    minHeight: 90,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
    marginTop: 4,
  },
});
