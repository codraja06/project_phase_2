import { FormDialog } from './FormDialog';
import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button } from './Button';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'info';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'alert-circle-outline',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const iconColor =
    confirmVariant === 'danger'
      ? COLORS.error
      : confirmVariant === 'info'
      ? COLORS.accent
      : COLORS.primary;

  const iconBg =
    confirmVariant === 'danger'
      ? COLORS.errorLight
      : confirmVariant === 'info'
      ? COLORS.accentLight
      : COLORS.primaryLight;

  return (
    <FormDialog visible={visible} onClose={onCancel}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={28} color={iconColor} />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonRow}>
                <Button
                  title={cancelText}
                  variant="secondary"
                  onPress={onCancel}
                  disabled={loading}
                  style={styles.cancelBtn}
                />
                <Button
                  title={confirmText}
                  variant={confirmVariant}
                  onPress={onConfirm}
                  loading={loading}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
    </FormDialog>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(4px)' as any,
    } : {}),
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 26,
    alignItems: 'center',
    ...SHADOWS.floating,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flexGrow: 1, flexBasis: 120,
  },
  confirmBtn: {
    flexGrow: 1, flexBasis: 120,
  },
});
