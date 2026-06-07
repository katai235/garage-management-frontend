import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  }, []);

  const validate = () => {
    let valid = true;
    if (!username.trim()) { setUsernameError('Username is required'); valid = false; } else setUsernameError('');
    if (!password) { setPasswordError('Password is required'); valid = false; }
    else if (password.length < 6) { setPasswordError('At least 6 characters'); valid = false; }
    else setPasswordError('');
    return valid;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      if (err.response?.status === 423) Alert.alert('Account Locked', err.response.data.error);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top decorative band */}
      <View style={styles.topBand}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>🔧</Text>
        </View>
        <Text style={styles.brandTop}>SAM SAEN THAI</Text>
        <Text style={styles.brandBottom}>KT Lo,. Co</Text>
        <Text style={styles.brandSub}>Garage Management System</Text>
      </View>

      {/* Form card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, Shadow.lg, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={t => { setUsername(t); clearError(); }}
              autoCapitalize="none"
              autoCorrect={false}
              error={usernameError}
              icon="👤"
              returnKeyType="next"
            />

            <View>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={t => { setPassword(t); clearError(); }}
                secureTextEntry={!showPassword}
                error={passwordError}
                icon="🔒"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.showPwdBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPwdText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <Button title="Sign In" onPress={handleLogin} loading={isLoading} style={styles.loginBtn} />

            <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerRow} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>© 2026 Sam Saen Thai KT Lo,. Co</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  topBand: {
    paddingTop: 60, paddingBottom: 40, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40,
  },
  circle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)', top: 20, left: -30,
  },
  circle3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 60,
  },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon: { fontSize: 38 },
  brandTop: { fontSize: Typography.lg, fontWeight: '400', color: 'rgba(255,255,255,0.8)', letterSpacing: 2 },
  brandBottom: { fontSize: Typography['2xl'], fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, marginTop: 2 },
  brandSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingBottom: 30 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl, marginTop: -20,
  },
  cardTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.base,
  },
  errorIcon: { fontSize: 16 },
  errorText: { color: Colors.danger, fontSize: Typography.sm, fontWeight: '500', flex: 1 },
  showPwdBtn: { position: 'absolute', right: 14, top: 36, padding: 4 },
  showPwdText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  loginBtn: { marginTop: Spacing.sm },
  forgotRow: { alignItems: 'center', marginTop: Spacing.md },
  forgotText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.base },
  registerText: { fontSize: Typography.base, color: Colors.textSecondary },
  registerLink: { fontSize: Typography.base, color: Colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: Typography.xs, color: 'rgba(255,255,255,0.4)', marginTop: Spacing.xl },
});
