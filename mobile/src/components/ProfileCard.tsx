import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { User } from '../types/auth';

interface ProfileCardProps {
  user: User | null;
  location?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  location = 'Ward 14 • Central Metro District',
}) => {
  const isOfficer = user?.role === 'authority';

  return (
    <View style={styles.card}>
      {/* Top Banner Accent */}
      <View
        style={[
          styles.topBanner,
          isOfficer ? styles.topBannerOfficer : styles.topBannerCitizen,
        ]}
      />

      <View style={styles.content}>
        {/* Avatar with Ring */}
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatarCircle,
              isOfficer ? styles.avatarCircleOfficer : styles.avatarCircleCitizen,
            ]}
          >
            <Ionicons
              name={isOfficer ? 'shield-checkmark' : 'person'}
              size={36}
              color={isOfficer ? COLORS.authorityPrimary : COLORS.primary}
            />
          </View>
        </View>

        {/* Role Pill */}
        <View
          style={[
            styles.roleBadge,
            isOfficer ? styles.roleBadgeOfficer : styles.roleBadgeCitizen,
          ]}
        >
          <Text
            style={[
              styles.roleBadgeText,
              isOfficer ? styles.roleTextOfficer : styles.roleTextCitizen,
            ]}
          >
            {isOfficer ? 'MUNICIPAL OPERATIONS OFFICER' : 'REGISTERED CITIZEN'}
          </Text>
        </View>

        {/* Name and Email */}
        <Text style={styles.name}>{user?.name || 'Civic User'}</Text>
        <Text style={styles.email}>{user?.email || 'user@civictrack.org'}</Text>

        {/* Contact Details Grid */}
        <View style={styles.detailsRow}>
          {user?.phone ? (
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 5 }} />
              <Text style={styles.detailText}>{user.phone}</Text>
            </View>
          ) : null}

          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 5 }} />
            <Text style={styles.detailText}>{location}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOWS.card,
  },
  topBanner: {
    height: 48,
    width: '100%',
  },
  topBannerCitizen: {
    backgroundColor: COLORS.primary,
  },
  topBannerOfficer: {
    backgroundColor: COLORS.authorityPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    alignItems: 'center',
    marginTop: -28,
  },
  avatarWrapper: {
    padding: 3,
    backgroundColor: COLORS.surface,
    borderRadius: 38,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleCitizen: {
    backgroundColor: COLORS.primaryLight,
  },
  avatarCircleOfficer: {
    backgroundColor: COLORS.authorityLight,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: 8,
  },
  roleBadgeCitizen: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.borderMaroon,
  },
  roleBadgeOfficer: {
    backgroundColor: COLORS.authorityLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  roleTextCitizen: {
    color: COLORS.primary,
  },
  roleTextOfficer: {
    color: COLORS.authorityPrimary,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
