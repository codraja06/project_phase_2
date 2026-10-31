import { Disclosure } from './Disclosure';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { categoryPhoto } from './CivicVisuals';

export interface CategoryItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const CATEGORY_OPTIONS: CategoryItem[] = [
  { key: 'pothole', label: 'Pothole', icon: 'warning-outline' },
  { key: 'road_damage', label: 'Road Damage', icon: 'construct-outline' },
  { key: 'garbage', label: 'Garbage', icon: 'trash-outline' },
  { key: 'garbage_overflow', label: 'Garbage Overflow', icon: 'trash' },
  { key: 'broken_streetlight', label: 'Broken Streetlight', icon: 'bulb-outline' },
  { key: 'drainage_problem', label: 'Drainage Problem', icon: 'water-outline' },
  { key: 'water_leakage', label: 'Water Leakage', icon: 'rainy-outline' },
  { key: 'dead_animal', label: 'Dead Animal', icon: 'paw-outline' },
  { key: 'broken_tree', label: 'Fallen / Broken Tree', icon: 'leaf-outline' },
  { key: 'other', label: 'Other Issue', icon: 'help-circle-outline' },
];

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  customCategory: string;
  onChangeCustomCategory: (val: string) => void;
  aiDetected?: boolean;
  aiClass?: string;
  aiConfidence?: number;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  customCategory,
  onChangeCustomCategory,
  aiDetected = false,
  aiClass = '',
  aiConfidence = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* AI Detection Banner or Unidentified Notice */}
      {aiDetected && aiClass ? (
        <View style={styles.aiSuccessBanner}>
          <View style={styles.bannerIconWrapper}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiSuccessTitle}>AI Detected Issue</Text>
            <Text style={styles.aiSuccessSubtitle}>
              {aiClass.replace(/_/g, ' ').toUpperCase()} • {Math.round(aiConfidence * 100)}% Confidence
            </Text>
          </View>
          <View style={styles.aiPill}>
            <Text style={styles.aiPillText}>YOLOv8</Text>
          </View>
        </View>
      ) : (
        <View style={styles.aiNoticeBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.secondaryDark} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiNoticeTitle}>No supported issue detected automatically.</Text>
            <Text style={styles.aiNoticeSubtitle}>
              Please select the appropriate civic hazard category below.
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Issue category: {CATEGORY_OPTIONS.find(item => item.key === selectedCategory)?.label || selectedCategory.replace(/_/g, ' ')}</Text>

      {/* Category Grid */}
      <Disclosure title="Change issue category" defaultExpanded={!aiDetected}><View style={styles.grid}>
        {CATEGORY_OPTIONS.map((item) => {
          const isSelected = selectedCategory === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.categoryCard,
                isSelected && styles.categoryCardSelected,
              ]}
              onPress={() => onSelectCategory(item.key)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.categoryIconCircle,
                  isSelected && styles.categoryIconCircleSelected,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={isSelected ? COLORS.surface : COLORS.primary}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  isSelected && styles.categoryLabelSelected,
                ]}
              >
                {item.label}
              </Text>
              {isSelected && (
                <View style={styles.checkIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      </Disclosure>
      {/* Custom Category Input if 'other' is selected */}
      {selectedCategory === 'other' && (
        <View style={styles.customInputContainer}>
          <Text style={styles.customInputLabel}>Specify Custom Category *</Text>
          <TextInput
            accessibilityLabel="Custom issue category"
            style={styles.customInput}
            placeholder="e.g. Fallen tree branch, damaged footpath..."
            placeholderTextColor={COLORS.textMuted}
            value={customCategory}
            onChangeText={onChangeCustomCategory}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  aiSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    marginBottom: 18,
  },
  bannerIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.secondaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.darkCharcoal,
  },
  aiSuccessSubtitle: {
    fontSize: 12,
    color: COLORS.secondaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  aiPill: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.darkCharcoal,
  },
  aiNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    marginBottom: 18,
  },
  aiNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  aiNoticeSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
    ...SHADOWS.sm,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryIconCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  checkIndicator: {
    marginLeft: 4,
  },
  customInputContainer: {
    marginTop: 14,
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  customInput: {
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});
