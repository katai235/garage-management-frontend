import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore'; 

const ROLES = ['staff', 'technician', 'manager'];

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', role: 'staff', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { t } = useLanguageStore();

  const set = (key: string) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({
        fullName: form.fullName,
        username: form.username.toLowerCase().trim(),
        email: form.email.toLowerCase().trim(),
        role: form.role,
        password: form.password,
      });
      Alert.alert('Account Created', 'The new account has been created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>{t('backToLogin')}</Text>
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={styles.logoEmoji}>🔧</Text></View>
            <View>
              <Text style={styles.title}>{t('createAccount')}</Text>
              <Text style={styles.subtitle}>Sam Saen Thai KT Lo,. Co Garage Management</Text>
            </View>
          </View>

          <View style={[styles.card, Shadow.lg]}>
            <Input
              label={t('fullName')}
              placeholder={t('Enteryourname')}
              value={form.fullName}
              onChangeText={set('fullName')}
              error={errors.fullName}
              icon="👤"
              autoCapitalize="words"
            />
            <Input
              label={t('username')}
              placeholder={t('Enteryourusername')}
              value={form.username}
              onChangeText={set('username')}
              error={errors.username}
              icon="🏷️"
              autoCapitalize="none"
            />
            <Input
              label={t('email')}
              placeholder={t('EnteryourEmail')}
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              icon="✉️"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Role Selector */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>{t('role')}</Text>
              <View style={styles.roleRow}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
                    onPress={() => setForm(prev => ({ ...prev, role }))}
                  >
                    <Text style={[styles.roleBtnText, form.role === role && styles.roleBtnTextActive]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label={t('password')}
              placeholder={t('Atleast6characters')}
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
              icon="🔒"
              secureTextEntry
            />
            <Input
              label={t('ConfirmPasswordlb')}
              placeholder={t('Reenteryourpassword')}
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              error={errors.confirmPassword}
              icon="🔒"
              secureTextEntry
            />

            <Button
              title={t('createAccount')}
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  content: { padding: Spacing.xl, paddingBottom: 40 },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.xl },
  logoBox: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadow.md,
  },
  logoEmoji: { fontSize: 28 },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl },
  roleSection: { marginBottom: Spacing.base },
  roleLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  roleBtnActive: { backgroundColor: Colors.primaryAlpha, borderColor: Colors.primary },
  roleBtnText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  roleBtnTextActive: { color: Colors.primary },
});
