import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly to us, such as your name, email address, phone number, and any other information you choose to provide when using our Garage Management System.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use the information we collect to operate and maintain the application, manage user accounts, process service records and invoices, send notifications about appointments and stock levels, and improve our services.',
  },
  {
    title: '3. Data Storage & Security',
    body: 'Your data is stored securely on our servers. We implement industry-standard security measures including encrypted passwords, JWT-based authentication, and secure token management to protect your information.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell, trade, or otherwise transfer your personal information to third parties. Data is only accessible to authorized staff within your organization based on their assigned role.',
  },
  {
    title: '5. Role-Based Access',
    body: 'Access to data within the system is controlled by user roles (Admin, Manager, Staff, Technician). Each role has specific permissions and can only access information relevant to their responsibilities.',
  },
  {
    title: '6. Data Retention',
    body: 'We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting your system administrator.',
  },
  {
    title: '7. Your Rights',
    body: 'You have the right to access, update, or delete your personal information. You can update your profile information directly in the app under Settings → Edit Profile.',
  },
  {
    title: '8. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of any changes by updating the date at the bottom of this policy.',
  },
  {
    title: '9. Contact Us',
    body: 'If you have any questions about this Privacy Policy or our data practices, please contact your system administrator.',
  },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroCard, Shadow.sm]}>
          <Text style={styles.heroIcon}>🔒</Text>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            Sam Saen Thai KT Lo,. Co — Garage Management System
          </Text>
          <Text style={styles.heroDate}>Last updated: June 2026</Text>
        </View>

        <Text style={styles.intro}>
          This Privacy Policy describes how we collect, use, and protect your information when you use our Garage Management System application.
        </Text>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <View key={i} style={[styles.section, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Sam Saen Thai KT Lo,. Co</Text>
          <Text style={styles.footerSub}>All rights reserved.</Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  headerTitle:  { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content:      { padding: Spacing.base },
  heroCard:     { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg },
  heroIcon:     { fontSize: 40, marginBottom: Spacing.sm },
  heroTitle:    { fontSize: Typography.xl, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  heroSubtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 6 },
  heroDate:     { fontSize: Typography.xs, color: 'rgba(255,255,255,0.6)' },
  intro:        { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },
  section:      { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionBody:  { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  footer:       { alignItems: 'center', paddingTop: Spacing.lg },
  footerText:   { fontSize: Typography.sm, color: Colors.textTertiary, fontWeight: '600' },
  footerSub:    { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
});
