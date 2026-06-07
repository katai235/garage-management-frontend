import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stockApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const ADJUST_TYPES = [
  { key: 'add',    label: '+ Add Stock',    color: Colors.success, bg: Colors.successLight, desc: 'Add new units received' },
  { key: 'remove', label: '- Remove Stock', color: Colors.danger,  bg: Colors.dangerLight,  desc: 'Remove used or damaged units' },
  { key: 'adjust', label: '⟳ Set Quantity', color: Colors.info,    bg: Colors.infoLight,    desc: 'Set exact quantity count' },
];

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function AdjustStockScreen({ navigation, route }: any) {
  const item = route?.params?.item;
  const [form, setForm] = useState({ type: 'add', quantity: '', notes: '' });
  const [loading, setLoading] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Adjust Stock</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textTertiary }}>Item not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentQty = item.quantity ?? 0;
  const costPrice = item.costPrice ?? item.cost_price ?? 0;
  const sellingPrice = item.sellingPrice ?? item.selling_price ?? 0;

  const getNewQty = () => {
    const q = parseInt(form.quantity) || 0;
    if (form.type === 'add') return currentQty + q;
    if (form.type === 'remove') return currentQty - q;
    return q;
  };

  const handleSubmit = async () => {
    if (!form.quantity || parseInt(form.quantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    const newQty = getNewQty();
    if (newQty < 0) {
      Alert.alert('Error', `Cannot remove more than current stock (${currentQty} units)`);
      return;
    }
    setLoading(true);
    try {
      await stockApi.adjust(item.id, {
        type: form.type,
        quantity: parseInt(form.quantity),
        notes: form.notes,
      });
      Alert.alert('✅ Stock Updated!',
        `${item.name}\nNew quantity: ${newQty} units`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to adjust stock');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Adjust Stock</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Item summary */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSku}>SKU: {item.sku} · {item.category}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Current Stock</Text>
                <Text style={[styles.statValue, { color: currentQty === 0 ? Colors.danger : currentQty <= (item.reorderLevel || 10) ? Colors.warning : Colors.success }]}>
                  {currentQty} units
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Reorder At</Text>
                <Text style={styles.statValue}>{item.reorderLevel ?? item.reorder_level ?? 10} units</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cost Price</Text>
                <Text style={styles.statValue}>{fmtKip(costPrice)}</Text>
              </View>
            </View>
          </View>

          {/* Adjustment type */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Adjustment Type</Text>
            {ADJUST_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeRow, form.type === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
                onPress={() => setForm(p => ({ ...p, type: t.key }))}
              >
                <View style={[styles.typeRadio, form.type === t.key && { borderColor: t.color }]}>
                  {form.type === t.key && <View style={[styles.typeRadioDot, { backgroundColor: t.color }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, form.type === t.key && { color: t.color }]}>{t.label}</Text>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <View style={[styles.card, Shadow.sm]}>
            <Input
              label={form.type === 'adjust' ? 'New Total Quantity *' : 'Quantity to ' + (form.type === 'add' ? 'Add *' : 'Remove *')}
              placeholder="0"
              value={form.quantity}
              onChangeText={q => setForm(p => ({ ...p, quantity: q }))}
              keyboardType="numeric"
            />
            {form.quantity ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>
                  {form.type === 'adjust' ? 'New quantity:' : form.type === 'add' ? `${currentQty} + ${form.quantity} =` : `${currentQty} - ${form.quantity} =`}
                </Text>
                <Text style={[styles.previewValue, { color: getNewQty() <= 0 ? Colors.danger : Colors.success }]}>
                  {getNewQty()} units
                </Text>
              </View>
            ) : null}
            <Input
              label="Reason / Notes"
              placeholder="e.g. Received from supplier, used in service..."
              value={form.notes}
              onChangeText={n => setForm(p => ({ ...p, notes: n }))}
              multiline
              numberOfLines={2}
            />
          </View>

          <Button title="✅ Confirm Adjustment" onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
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
  itemName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  itemSku: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 4 },
  statValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceSecondary, marginBottom: 8 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  typeRadioDot: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  typeDesc: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  previewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  previewLabel: { fontSize: Typography.base, color: Colors.textSecondary },
  previewValue: { fontSize: Typography.xl, fontWeight: '800' },
});
