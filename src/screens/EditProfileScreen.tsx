import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

export default function EditProfileScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email:    user?.email    || '',
    phone:    user?.phone    || '',
  });

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim())    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.updateProfile({
        fullName: form.fullName.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim(),
      });
      if (setUser) {
        setUser({ ...user, fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() });
      }
      Alert.alert('✅ Profile Updated', 'Your information has been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile.');
    } finally { setLoading(false); }
  };

  const initials = (form.fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.avatarName}>{form.fullName || user?.fullName}</Text>
            <Text style={styles.avatarRole}>{user?.role}</Text>
          </View>

          {/* Form */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Input
              label="Full Name *"
              placeholder="Your full name"
              value={form.fullName}
              onChangeText={set('fullName')}
              error={errors.fullName}
              autoCapitalize="words"
            />
            <Input
              label="Email Address *"
              placeholder="your@email.com"
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Phone Number"
              placeholder="+856 20 XXXX XXXX"
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
            />

            {/* Username — read only */}
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Username</Text>
              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyValue}>@{user?.username}</Text>
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedText}>🔒 Cannot change</Text>
                </View>
              </View>
            </View>

            <Button
              title="💾 Save Changes"
              onPress={handleSave}
              loading={loading}
              style={{ marginTop: Spacing.md }}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtnText:   { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  title:         { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content:       { padding: Spacing.base, paddingBottom: 60 },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...Shadow.md },
  avatarText:    { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarName:    { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  avatarRole:    { fontSize: Typography.sm, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },

  card:          { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle:  { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  readOnlyField: { marginBottom: Spacing.md },
  readOnlyLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  readOnlyBox:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
  readOnlyValue: { fontSize: Typography.base, color: Colors.textTertiary, fontWeight: '600' },
  lockedBadge:   { backgroundColor: Colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  lockedText:    { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: '600' },
});
