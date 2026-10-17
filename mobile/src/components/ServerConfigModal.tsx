import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormDialog } from './FormDialog';
import { storageService } from '../services/storage';
import { API_BASE_URL } from '../constants/config';
import { COLORS } from '../theme/colors';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (url: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadCurrentUrl();
    }
  }, [visible]);

  const loadCurrentUrl = async () => {
    try {
      const custom = await storageService.getCustomServerUrl();
      setUrl(custom || API_BASE_URL);
      setTestResult(null);
    } catch {
      setUrl(API_BASE_URL);
    }
  };

  const handleTestConnection = async () => {
    const target = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\/[^\s/@?#]+(?::\d+)?\/api$/i.test(target)) {
      setTestResult({
        success: false,
        message: 'Enter the full backend address ending in /api, such as http://192.168.1.10:5000/api.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const start = Date.now();

    const healthUrl = `${target}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      const latency = Date.now() - start;

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Connected successfully! (HTTP ${response.status})`,
          latencyMs: latency,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server reached but responded with HTTP ${response.status}`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.name === 'AbortError'
          ? 'Connection timed out (6s). Server not responding.'
          : err.message || 'Network request failed';

      setTestResult({
        success: false,
        message: `Cannot reach server: ${errorMsg}. Check IP and Wi-Fi.`,
      });
    } finally {
      clearTimeout(timeoutId);
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const clean = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\/[^\s/@?#]+(?::\d+)?\/api$/i.test(clean)) {
      setTestResult({ success: false, message: 'Enter a valid backend address ending in /api before saving.' });
      return;
    }

    try {
      await storageService.setCustomServerUrl(clean);
      if (onSaved) {
        onSaved(clean);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save custom server URL:', err);
    }
  };

  const handleResetDefault = async () => {
    try {
      await storageService.removeCustomServerUrl();
      setUrl(API_BASE_URL);
      setTestResult(null);
      if (onSaved) {
        onSaved(API_BASE_URL);
      }
    } catch (err) {
      console.error('Failed to reset server URL:', err);
    }
  };

  return (
    <FormDialog visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="server-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Backend Server Settings</Text>
          <Text style={styles.subtitle}>Configure API host for your Android device</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Server Base URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={(val) => {
            setUrl(val);
            setTestResult(null);
          }}
          placeholder="http://192.168.X.X:5000/api"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.hint}>
          Build default URL: <Text style={styles.hintBold}>{API_BASE_URL}</Text>
        </Text>

        {testResult && (
          <View
            style={[
              styles.testResultBox,
              testResult.success ? styles.testSuccessBox : styles.testErrorBox,
            ]}
          >
            <Ionicons
              name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={testResult.success ? COLORS.resolvedDark : COLORS.error}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.testResultText,
                testResult.success ? styles.testSuccessText : styles.testErrorText,
              ]}
            >
              {testResult.message}
              {testResult.latencyMs !== undefined ? ` • ${testResult.latencyMs}ms` : ''}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.testButton, testing && styles.buttonDisabled]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                <Text style={styles.testButtonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetDefault}>
            <Text style={styles.resetButtonText}>Reset Default</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save & Apply</Text>
        </TouchableOpacity>
      </View>
    </FormDialog>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  body: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAF9',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  hintBold: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  testSuccessBox: {
    backgroundColor: COLORS.resolvedLight,
    borderColor: COLORS.resolvedBorder,
    borderWidth: 1,
  },
  testErrorBox: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
  },
  testResultText: {
    fontSize: 12,
    flex: 1,
  },
  testSuccessText: {
    color: COLORS.resolvedDark,
    fontWeight: '500',
  },
  testErrorText: {
    color: COLORS.errorDark,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderMaroon,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resetButtonText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 14,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
