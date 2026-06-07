import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

// ── Strength calculator (pure function, outside component) ──────────────────
const getStrength = (pw: string) => {
  const score =
    (pw.length >= 6 ? 1 : 0) +
    (pw.length >= 10 ? 1 : 0) +
    (/[A-Z]/.test(pw) || /[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  const labels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = [Colors.danger, Colors.danger, Colors.warning, Colors.info, Colors.success];
  return { score, label: labels[score], color: colors[score] };
};

export default function ChangePasswordScreen({ navigation }: any) {
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrent, setShowCurrent]           = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [errors, setErrors]                     = useState<Record<string, string>>({});
  const [loading, setLoading]                   = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = 'Current password is required';
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (currentPassword && newPassword && currentPassword === newPassword)
      e.newPassword = 'New password must be different from current password';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to change password. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = newPassword.length > 0 ? getStrength(newPassword) : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              Choose a strong password that's at least 6 characters long.
            </Text>
          </View>

          <View style={[styles.card, Shadow.sm]}>
            {/* Current Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Current Password</Text>
              <View style={[styles.inputRow, errors.currentPassword ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your current password"
                  placeholderTextColor={Colors.textTertiary}
                  value={currentPassword}
                  onChangeText={v => { setCurrentPassword(v); if (errors.currentPassword) setErrors(p => ({ ...p, currentPassword: '' })); }}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(p => !p)}>
                  <Text style={styles.eyeIcon}>{showCurrent ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.currentPassword ? <Text style={styles.errorText}>{errors.currentPassword}</Text> : null}
            </View>

            <View style={styles.divider} />

            {/* New Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputRow, errors.newPassword ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your new password"
                  placeholderTextColor={Colors.textTertiary}
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); if (errors.newPassword) setErrors(p => ({ ...p, newPassword: '' })); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(p => !p)}>
                  <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}

              {/* Strength indicator */}
              {strength && (
                <View style={styles.strengthRow}>
                  <Text style={styles.strengthLabel}>Strength:</Text>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : Colors.border }]}
                    />
                  ))}
                  <Text style={[styles.strengthHint, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={[styles.inputRow, errors.confirmPassword ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={Colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Updating...' : '🔐 Update Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.base, gap: Spacing.md },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.infoLight, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.info,
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: Typography.sm, color: Colors.info, fontWeight: '500' },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, gap: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
  fieldWrap: { gap: 6 },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
  },
  inputError: { borderColor: Colors.danger },
  input: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 16 },
  errorText: { fontSize: Typography.xs, color: Colors.danger },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  strengthLabel: { fontSize: Typography.xs, color: Colors.textTertiary },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthHint: { fontSize: Typography.xs, fontWeight: '700', minWidth: 64 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelBtnText: { fontSize: Typography.base, color: Colors.textSecondary, fontWeight: '600' },
});
