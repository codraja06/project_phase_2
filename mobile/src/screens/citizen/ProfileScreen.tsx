import AsyncStorage from '@react-native-async-storage/async-storage';
import { useComplaintSummary } from '../../hooks/useComplaintSummary';
import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Modal,
  Platform,
  Switch} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { PhotoCredits } from '../../components/CivicVisuals';
import { authApi } from '../../api/authApi';
import { googleAuthService } from '../../services/googleAuth';
import { Input, PasswordInput } from '../../components/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FormDialog } from '../../components/FormDialog';
import { showMessage } from '../../utils/showMessage';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export const ProfileScreen = ({ navigation }: any) => {
  const { isWide: isDesktop } = useBreakpoint();
  const { user, logout, updateUser, updateSession } = useAuth();

  // Modals
  const { complaints, loading: statsLoading, error: statsError, refresh: refreshStats } = useComplaintSummary('citizen');
  const count = (status?: string) => statsLoading || statsError ? '—' : String(status ? complaints.filter(c => c.status === status).length : complaints.length);

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [notifSettingsVisible, setNotifSettingsVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Edit Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Notification Preferences State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const preferencesKey = `notification-preferences:${user?._id || user?.email}`;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferencesKey).then(value => {
      if (!value || !active) return;
      const settings = JSON.parse(value); setPushEnabled(Boolean(settings.push));
    }).catch(() => showMessage('Preferences unavailable', 'Please save your notification preferences again.'));
    return () => { active = false; };
  }, [preferencesKey]);
  useEffect(() => {
    setEmailAlertsEnabled(user?.notificationPreferences?.email ?? true);
    setSmsAlertsEnabled(user?.notificationPreferences?.sms ?? false);
  }, [user?.notificationPreferences?.email, user?.notificationPreferences?.sms]);
  const savePreferences = async () => {
    if (savingPreferences) return;
    setSavingPreferences(true);
    try {
      const updated = await authApi.updateNotificationPreferences(emailAlertsEnabled, smsAlertsEnabled);
      updateUser(updated);
      await AsyncStorage.setItem(preferencesKey, JSON.stringify({ push: pushEnabled, email: emailAlertsEnabled, sms: smsAlertsEnabled }));
      setNotifSettingsVisible(false);
      showMessage('Notification preferences saved', 'Email requires a verified email address and configured provider. SMS also requires a verified phone number and your consent.');
    } catch { showMessage('Unable to save preferences', 'Please retry.'); }
    finally { setSavingPreferences(false); }
  };
  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);
      const updated = await authApi.updateProfile({ name, phone });
      updateUser(updated);
      setEditProfileVisible(false);
      showMessage('Profile Updated', 'Your profile details have been successfully saved.');
    } catch (error: any) {
      showMessage('Update Failed', error.message || 'Failed to update profile details.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      showMessage('Validation Error', 'Please enter both current and new passwords.');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    try {
      setUpdatingPassword(true);
      const session = await authApi.changePassword({ oldPassword, newPassword });
      if (session) await updateSession(session);
      setOldPassword('');
      setNewPassword('');
      setChangePasswordVisible(false);
      showMessage('Security Update', 'Your password has been changed successfully.');
    } catch (error: any) {
      showMessage('Password Change Failed', error.message || 'Incorrect current password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (user?.googleId) {
      showMessage('Google Connected', 'This account is already linked to Google.');
      return;
    }
    if (linkingGoogle) return;
    try {
      setLinkingGoogle(true);
      const updated = await googleAuthService.linkGoogle();
      updateUser(updated);
      showMessage('Google Connected', 'You can now use Continue with Google to sign in.');
    } catch (error: any) {
      if (!error.message?.toLowerCase().includes('cancelled')) {
        showMessage('Could Not Connect Google', error.message || 'Please try again.');
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleHelpSupport = () => {
    showMessage(
      'CivicTrack Support & Helpline',
      'Local support contact has not been configured. Please contact your municipality directly.'
    );
  };

  const handleAbout = () => {
    showMessage(
      'About CivicTrack',
      'CivicTrack v1.0.0\nAI-Powered Civic Issue Detection and Smart Complaint Management System.\nEmpowering citizens with YOLOv8 Computer Vision & direct municipal triage integration.'
    );
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'CT';

  const menuSections = [
    {
      title: 'Account & Security',
      items: [
        {
          icon: 'create-outline' as const,
          iconBg: COLORS.primaryLight,
          iconColor: COLORS.primary,
          label: 'Edit Profile Information',
          sub: 'Update display name & contact number',
          onPress: () => {
            setName(user?.name || '');
            setPhone(user?.phone || '');
            setEditProfileVisible(true);
          }},
        {
          icon: 'lock-closed-outline' as const,
          iconBg: COLORS.primaryLight,
          iconColor: COLORS.primary,
          label: 'Password & Security',
          sub: 'Change password and secure login',
          onPress: () => setChangePasswordVisible(true)},
        {
          icon: 'logo-google' as const,
          iconBg: COLORS.primaryLight,
          iconColor: COLORS.primary,
          label: user?.googleId ? 'Google Account Connected' : 'Connect Google Account',
          sub: user?.googleId ? 'Use Google at your next sign-in' : 'Link your account for Google sign-in',
          onPress: handleLinkGoogle},
        {
          icon: 'notifications-outline' as const,
          iconBg: '#FEFCE8', // Yellow tint
          iconColor: COLORS.warning,
          label: 'Notification Preferences',
          sub: 'Manage push, email & SMS alerts',
          onPress: () => setNotifSettingsVisible(true)},
      ]},
    {
      title: 'Support & Info',
      items: [
        {
          icon: 'call-outline' as const,
          iconBg: COLORS.borderLight,
          iconColor: COLORS.textSecondary,
          label: 'Civic Assistance',
          sub: 'Reporting guidance and support information',
          onPress: () => navigation.navigate('CivicAssistant')},
        {
          icon: 'information-circle-outline' as const,
          iconBg: COLORS.borderLight,
          iconColor: COLORS.textSecondary,
          label: 'About CivicTrack Platform',
          sub: 'Version 1.0.0 • AI-Driven Civic Tech',
          onPress: handleAbout},
      ]},
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={isDesktop ? styles.desktopContent : styles.mobileContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20 }}></View>
        <Animated.View entering={FadeInDown.duration(400)} style={isDesktop ? styles.desktopHeader : styles.mobileHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('CitizenDashboard')}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </Animated.View>

        {/* ── Compact Profile Header ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <Card style={styles.profileHeaderCard}>
            <CardContent style={isDesktop ? styles.profileHeaderDesktop : styles.profileHeaderMobile}>
              <View style={styles.profileHeaderLeft}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.name || 'CivicTrack Citizen'}</Text>
                  <View style={styles.badgeRow}>
                    <Badge label="CITIZEN ACCOUNT" variant="outline" icon={<Ionicons name="shield-checkmark" size={10} color={COLORS.primary} />} />
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                  </View>
                  <Text style={styles.profileLocality}>Citizen account</Text>
                </View>
              </View>
              <Button
                title="Edit Profile"
                variant="secondary"
                onPress={() => {
                  setName(user?.name || '');
                  setPhone(user?.phone || '');
                  setEditProfileVisible(true);
                }}
                icon={<Ionicons name="create-outline" size={16} color={COLORS.textPrimary} />}
                style={isDesktop ? {} : { width: '100%' }}
              />
            </CardContent>
          </Card>
        </Animated.View>

        {/* ── Compact Stat Cards ──────────────────────────────────────────── */}
        {!!statsError && (
          <View accessibilityRole="alert" style={styles.statsErrorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.statsErrorText}>{statsError}</Text>
            <Button title="Retry" variant="outline" size="sm" onPress={refreshStats} style={{ marginLeft: 'auto' }} />
          </View>
        )}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.statsGrid}>
          {[
            { label: 'Reports', value: count(), color: COLORS.primary },
            { label: 'Pending', value: count('Pending'), color: COLORS.pending },
            { label: 'In Progress', value: count('In Progress'), color: COLORS.inProgress },
            { label: 'Resolved', value: count('Resolved'), color: COLORS.resolved },
          ].map((stat, i) => (
            <Card key={i} style={isDesktop ? styles.statCardDesktop : styles.statCard}>
              <CardContent style={styles.statCardContent}>
                <Text numberOfLines={1} style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
              </CardContent>
            </Card>
          ))}
        </Animated.View>

        {/* ── Menu Sections ─────────────────────────────────────────────────── */}
        <View style={isDesktop ? styles.desktopMenuGrid : {}}>
          {menuSections.map((section, sectionIdx) => (
            <Animated.View entering={FadeInUp.delay(300 + sectionIdx * 100)} key={section.title} style={isDesktop ? styles.menuCol : { marginBottom: SPACING['3xl'] }}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <Card>
                <View style={{ paddingVertical: SPACING.sm }}>
                  {section.items.map((item, idx) => (
                    <View key={item.label}>
                      <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                        <View style={styles.menuLeft}>
                          <View style={[styles.menuIconBadge, { backgroundColor: item.iconBg }]}>
                            <Ionicons name={item.icon} size={18} color={item.iconColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuSub}>{item.sub}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.borderStrong} />
                      </TouchableOpacity>
                      {idx < section.items.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(500)}>
          <Text style={styles.sectionHeader}>Danger Zone</Text>
          <Card style={{ borderColor: COLORS.errorBorder }}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.7}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconBadge, { backgroundColor: COLORS.errorLight }]}>
                  <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: COLORS.error }]}>Sign Out</Text>
                  <Text style={styles.menuSub}>End active citizen session</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(600)} style={styles.footerVersion}>CivicTrack v1.0.0 • AI-Powered Civic Management</Animated.Text>
        <PhotoCredits />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Profile Modal */}
      <FormDialog visible={editProfileVisible} onClose={() => setEditProfileVisible(false)}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Information</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close dialog" onPress={() => setEditProfileVisible(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Full Display Name"
              value={name}
              onChangeText={setName}
              leftIcon="person-outline"
            />

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
              placeholder="+91 98765 43210"
            />

            <Button
              title="Save Changes"
              onPress={handleUpdateProfile}
              loading={updatingProfile}
              style={{ marginTop: SPACING.sm }}
            />
      </FormDialog>

      {/* Change Password Modal */}
      <FormDialog visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Security Password</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close dialog" onPress={() => setChangePasswordVisible(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <PasswordInput
              label="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Enter current password"
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 chars)"
              helperText="Must be at least 6 characters"
            />

            <Button
              title="Update Password"
              onPress={handleChangePassword}
              loading={updatingPassword}
              style={{ marginTop: SPACING.sm }}
            />
      </FormDialog>

      {/* Notification Preferences Modal */}
      <FormDialog visible={notifSettingsVisible} onClose={() => setNotifSettingsVisible(false)}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close dialog" onPress={() => setNotifSettingsVisible(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleSubtitle}>Preference only; delivery service not configured</Text>
              </View>
              <Switch accessibilityLabel="Push notification preference" disabled={savingPreferences} value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: COLORS.borderStrong, true: COLORS.primary }} />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Resolution Emails</Text>
                <Text style={styles.toggleSubtitle}>{user?.emailVerifiedAt ? 'Verified email; sent when the provider is configured' : 'Email not verified; external delivery will be skipped'}</Text>
              </View>
              <Switch accessibilityLabel="Email resolution notifications" disabled={savingPreferences} value={emailAlertsEnabled} onValueChange={setEmailAlertsEnabled} trackColor={{ false: COLORS.borderStrong, true: COLORS.primary }} />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>I consent to SMS resolution updates</Text>
                <Text style={styles.toggleSubtitle}>{user?.phoneVerifiedAt ? 'Verified phone; requires a configured SMS provider' : 'Phone not verified; SMS delivery will be skipped'}</Text>
              </View>
              <Switch accessibilityLabel="Consent to SMS resolution notifications" disabled={savingPreferences} value={smsAlertsEnabled} onValueChange={setSmsAlertsEnabled} trackColor={{ false: COLORS.borderStrong, true: COLORS.primary }} />
            </View>

            <Button
              title="Save Preferences"
              loading={savingPreferences}
              disabled={savingPreferences}
              onPress={savePreferences}
              style={{ marginTop: SPACING.lg }}
            />
      </FormDialog>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        visible={logoutModalVisible}
        title="Sign Out of CivicTrack"
        message="Are you sure you want to end your active session? You will be prompted to sign in when you reopen the app."
        confirmText="Sign Out"
        confirmVariant="danger"
        icon="log-out-outline"
        onConfirm={async () => {
          setLogoutModalVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  desktopContent: { padding: 24, maxWidth: 1280, alignSelf: 'center', width: '100%' },
  mobileContent: { padding: SPACING.lg, paddingBottom: 100 },
  desktopHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['4xl'] },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['3xl'], marginTop: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, marginRight: SPACING.md },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  profileHeaderCard: { marginBottom: SPACING['3xl'] },
  profileHeaderDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING['3xl'] },
  profileHeaderMobile: { flexDirection: 'column', padding: SPACING['2xl'] },
  profileHeaderLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'web' ? 0 : SPACING.lg },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.lg },
  avatarText: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  profileInfo: { flex: 1 },
  profileName: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs, flexWrap: 'wrap' },
  profileEmail: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '500' },
  profileLocality: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  statsErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statsErrorText: { ...TYPOGRAPHY.caption, color: COLORS.errorDark, fontWeight: '600', flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING['4xl'] },
  statCard: {
    flexBasis: Platform.OS === 'web' ? ('calc(50% - 6px)' as any) : '47%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 100,
    padding: 0},
  statCardDesktop: {
    flexBasis: Platform.OS === 'web' ? ('calc(25% - 9px)' as any) : '22%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 120,
    padding: 0},
  statCardContent: { padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...TYPOGRAPHY.h2, marginBottom: 4 },
  statLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  desktopMenuGrid: { flexDirection: 'row', gap: SPACING['3xl'], marginBottom: SPACING['3xl'] },
  menuCol: { flex: 1 },
  sectionHeader: { ...TYPOGRAPHY.overline, color: COLORS.textMuted, marginBottom: SPACING.md, paddingHorizontal: SPACING.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}) },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconBadge: { width: 36, height: 36, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  menuLabel: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  menuSub: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },
  footerVersion: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING['4xl'], marginBottom: SPACING.md, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING['3xl'], ...SHADOWS.floating },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING['2xl'] },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md },
  toggleTitle: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  toggleSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary }});
