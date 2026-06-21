import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { invoiceApi } from '../services/api';
import { Input, Button, StatusBadge } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

const PAYMENT_METHODS = [
  { key: 'cash', label: '💵 Cash' },
  { key: 'card', label: '💳 Card' },
  { key: 'bank_transfer', label: '🏦 Bank Transfer' },
  { key: 'qr_code', label: '📱 QR / PromptPay' },
  { key: 'other', label: '🔄 Other' },
];

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (isNaN(n) || !v) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function RecordPaymentScreen({ navigation, route }: any) {
  const invoice = route?.params?.invoice;
  const totalAmount = parseFloat(String(invoice?.totalAmount ?? invoice?.total_amount ?? 0));
  const paidAmount = parseFloat(String(invoice?.paidAmount ?? invoice?.paid_amount ?? 0));
  const balance = totalAmount - paidAmount;
  const { t } = useLanguageStore();

  const [form, setForm] = useState({
    amount: Math.round(balance).toString(),
    paymentMethod: 'cash',
    paymentReference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>{t('recordPayment')}</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textTertiary, fontSize: Typography.lg }}>Invoice not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    if (amount > balance + 1) {
      Alert.alert('Error', `Amount cannot exceed balance of ${fmtKip(balance)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await invoiceApi.recordPayment(invoice.id, {
        amount,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        notes: form.notes,
      });
      Alert.alert(
        '✅ Payment Recorded!',
        `${fmtKip(amount)} received via ${form.paymentMethod.replace('_', ' ')}.\nInvoice status: ${res.data.status}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
    } finally { setLoading(false); }
  };

  const invoiceNum = invoice.invoiceNumber ?? invoice.invoice_number ?? '—';
  const customerName = invoice.customerName ?? invoice.customer_name ?? '—';
  const status = invoice.status ?? 'draft';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ {t('back')}</Text></TouchableOpacity>
          <Text style={styles.title}>{t('recordPayment')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Invoice Summary */}
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceNum}>{invoiceNum}</Text>
              <StatusBadge status={status} />
            </View>
            <Text style={styles.customerName}>👤 {customerName}</Text>
            <View style={styles.amountGrid}>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>{t('total')}</Text>
                <Text style={styles.amountValue}>{fmtKip(totalAmount)}</Text>
              </View>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>{t('paid')}</Text>
                <Text style={[styles.amountValue, { color: Colors.success }]}>{fmtKip(paidAmount)}</Text>
              </View>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>{t('balance')}</Text>
                <Text style={[styles.amountValue, { color: Colors.danger }]}>{fmtKip(balance)}</Text>
              </View>
            </View>
          </View>

          {/* Amount */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{`${t('paymentamount')} (₭)`}</Text>
            <Input
              label={`${t('amountin')} *`}
              placeholder="0"
              value={form.amount}
              onChangeText={t => setForm(p => ({ ...p, amount: t }))}
              keyboardType="numeric"
              icon="₭"
            />
            <View style={styles.quickRow}>
              <Text style={styles.quickLabel}>Quick:</Text>
              <TouchableOpacity style={styles.quickBtn} onPress={() => setForm(p => ({ ...p, amount: Math.round(balance / 2).toString() }))}>
                <Text style={styles.quickBtnText}>50% ({fmtKip(balance / 2)})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => setForm(p => ({ ...p, amount: Math.round(balance).toString() }))}>
                <Text style={styles.quickBtnText}>Full ({fmtKip(balance)})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('paymentMethod')}</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, form.paymentMethod === m.key && styles.methodBtnActive]}
                  onPress={() => setForm(p => ({ ...p, paymentMethod: m.key }))}
                >
                  <Text style={[styles.methodText, form.paymentMethod === m.key && styles.methodTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reference & Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Input label={t('Referenceoption')} placeholder="Transaction ID, receipt no..." value={form.paymentReference} onChangeText={t => setForm(p => ({ ...p, paymentReference: t }))} />
            <Input label={t('Noteoptional')} placeholder="Additional notes..." value={form.notes} onChangeText={t => setForm(p => ({ ...p, notes: t }))} multiline numberOfLines={2} />
          </View>

          <Button title= {t('confirmpayment')} onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.base },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  customerName: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.md },
  amountGrid: { flexDirection: 'row', gap: 8 },
  amountItem: { flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  amountLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 4 },
  amountValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  quickLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  quickBtn: { backgroundColor: Colors.primaryAlpha, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  quickBtnText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.primary },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  methodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  methodText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  methodTextActive: { color: Colors.primary },
});
