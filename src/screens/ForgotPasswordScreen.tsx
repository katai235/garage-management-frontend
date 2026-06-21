import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const { t } = useLanguageStore();

  const handleSend = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert(t('invalidEmail'), t('enterValidEmail'));
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      // Show success even on error to avoid email enumeration
      setSent(true);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ {t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('forgotPasswordHeader')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          {!sent ? (
            <>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>🔒</Text>
              </View>
              <Text style={styles.title}>{t('resetYourPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('resetPasswordSubtitle')}
              </Text>

              <View style={[styles.card, Shadow.sm]}>
                <Input
                  label={t('emailAddress')}
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <Button
                  title={`📧 ${t('sendResetLink')}`}
                  onPress={handleSend}
                  loading={loading}
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                <Text style={styles.icon}>✅</Text>
              </View>
              <Text style={styles.title}>{t('checkYourEmail')}</Text>
              <Text style={styles.subtitle}>
                {t('resetLinkSentPrefix')} <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{email}</Text>{t('resetLinkSentSuffix')}
              </Text>
              <Text style={styles.hint}>
                {t('checkSpam')}
              </Text>
              <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.goBack()}>
                <Text style={styles.backToLoginText}>{t('backToLogin')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:         { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  headerTitle:     { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content:         { flex: 1, padding: Spacing.base, alignItems: 'center', paddingTop: Spacing.xl * 2 },
  iconCircle:      { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryAlpha, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  icon:            { fontSize: 36 },
  title:           { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle:        { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl, paddingHorizontal: Spacing.md },
  hint:            { fontSize: Typography.sm, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.xl },
  card:            { width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base },
  backToLogin:     { marginTop: Spacing.lg },
  backToLoginText: { fontSize: Typography.base, color: Colors.primary, fontWeight: '700' },
});
