import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TextInput, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

type Step = 'email' | 'pin' | 'done';

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

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<any>(null);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendPin = async () => {
    if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: 'Please enter a valid email' }); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      // Show debug PIN in dev
      if (res.data.debug_pin) {
        Alert.alert('Development Mode', `Your PIN is: ${res.data.debug_pin}\n\n(This message will not appear in production)`);
      }
      setStep('pin');
      startCooldown();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || JSON.stringify(error);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      if (res.data.debug_pin) {
        Alert.alert('Development Mode', `Your new PIN is: ${res.data.debug_pin}`);
      }
      setPin('');
      startCooldown();
      Alert.alert('PIN Resent', 'A new PIN has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Failed to resend PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const e: Record<string, string> = {};
    if (pin.length !== 6) e.pin = 'Please enter the 6-digit PIN';
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim().toLowerCase(), pin, newPassword });
      setStep('done');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to reset password. Please try again.';
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
          <TouchableOpacity onPress={() => step === 'pin' ? setStep('email') : navigation.goBack()}>
            <Text style={styles.backBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Forgot Password</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {(['email', 'pin', 'done'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <View style={[styles.stepDot, (step === s || (i < (['email','pin','done'] as Step[]).indexOf(step) + 1 )) && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step === s && styles.stepDotTextActive]}>{i + 1}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, i < (['email','pin','done'] as Step[]).indexOf(step) && styles.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <View style={styles.stepContent}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconCircleText}>📧</Text>
              </View>
              <Text style={styles.stepTitle}>Enter Your Email</Text>
              <Text style={styles.stepSubtitle}>
                We'll send a 6-digit PIN to reset your password.
              </Text>

              <View style={[styles.card, Shadow.sm]}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={v => { setEmail(v); setErrors({}); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendPin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : '📨 Send Reset PIN'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: PIN + New Password ── */}
          {step === 'pin' && (
            <View style={styles.stepContent}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconCircleText}>🔑</Text>
              </View>
              <Text style={styles.stepTitle}>Enter PIN & New Password</Text>
              <Text style={styles.stepSubtitle}>
                Enter the 6-digit PIN sent to{'\n'}
                <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{email}</Text>
              </Text>

              <View style={[styles.card, Shadow.sm]}>
                {/* PIN input */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>6-Digit PIN</Text>
                  <TextInput
                    style={[styles.pinInput, errors.pin ? styles.inputError : null]}
                    placeholder="000000"
                    placeholderTextColor={Colors.textTertiary}
                    value={pin}
                    onChangeText={v => { setPin(v.replace(/\D/g, '').slice(0, 6)); setErrors(p => ({ ...p, pin: '' })); }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  {errors.pin ? <Text style={styles.errorText}>{errors.pin}</Text> : null}
                </View>

                <View style={styles.divider} />

                {/* New Password */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={[styles.inputRow, errors.newPassword ? styles.inputError : null]}>
                    <TextInput
                      style={styles.inputFlex}
                      placeholder="Enter new password"
                      placeholderTextColor={Colors.textTertiary}
                      value={newPassword}
                      onChangeText={v => { setNewPassword(v); setErrors(p => ({ ...p, newPassword: '' })); }}
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(p => !p)}>
                      <Text>{showNew ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
                  {strength && (
                    <View style={styles.strengthRow}>
                      <Text style={styles.strengthLabel}>Strength:</Text>
                      {[1, 2, 3, 4].map(i => (
                        <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : Colors.border }]} />
                      ))}
                      <Text style={[styles.strengthHint, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputRow, errors.confirmPassword ? styles.inputError : null]}>
                    <TextInput
                      style={styles.inputFlex}
                      placeholder="Re-enter new password"
                      placeholderTextColor={Colors.textTertiary}
                      value={confirmPassword}
                      onChangeText={v => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
                      <Text>{showConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Resetting...' : '🔐 Reset Password'}</Text>
              </TouchableOpacity>

              {/* Resend */}
              <TouchableOpacity
                style={[styles.resendBtn, resendCooldown > 0 && styles.resendBtnDisabled]}
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={[styles.resendText, resendCooldown > 0 && { color: Colors.textTertiary }]}>
                  {resendCooldown > 0 ? `Resend PIN in ${resendCooldown}s` : "Didn't receive it? Resend PIN"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 'done' && (
            <View style={[styles.stepContent, { alignItems: 'center' }]}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.successLight, width: 100, height: 100, borderRadius: 50 }]}>
                <Text style={{ fontSize: 50 }}>✅</Text>
              </View>
              <Text style={styles.stepTitle}>Password Reset!</Text>
              <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
                Your password has been reset successfully.{'\n'}Please log in with your new password.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: Spacing.xl }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>← Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
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
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepDotText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textTertiary },
  stepDotTextActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: Colors.primary },
  content: { padding: Spacing.base, paddingBottom: 60 },
  stepContent: { gap: Spacing.md },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryAlpha,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginVertical: Spacing.md,
  },
  iconCircleText: { fontSize: 36 },
  stepTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  stepSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, gap: Spacing.md },
  fieldWrap: { gap: 6 },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary, paddingHorizontal: Spacing.md,
    paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary,
  },
  pinInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary, paddingHorizontal: Spacing.md,
    paddingVertical: 14, fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', letterSpacing: 12,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
  },
  inputFlex: { flex: 1, paddingVertical: 12, fontSize: Typography.base, color: Colors.textPrimary },
  inputError: { borderColor: Colors.danger },
  eyeBtn: { padding: 6 },
  errorText: { fontSize: Typography.xs, color: Colors.danger },
  divider: { height: 1, backgroundColor: Colors.border },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  strengthLabel: { fontSize: Typography.xs, color: Colors.textTertiary },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthHint: { fontSize: Typography.xs, fontWeight: '700', minWidth: 64 },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  resendBtnDisabled: {},
  resendText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
});
