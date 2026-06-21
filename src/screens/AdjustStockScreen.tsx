import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stockApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

const fmtKip = (v: any) => {
  const n = parseFloat(v);
  if (!n || isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Built inside the component (as a function) since it needs access to t()
const getAdjustTypes = (t: (key: any) => string) => [
  { key: 'add',    label: '+ ' + t('addStockLabel'),    color: Colors.success, bg: Colors.successLight, desc: t('addStockDesc') },
  { key: 'remove', label: '- ' + t('removeStockLabel'), color: Colors.danger,  bg: Colors.dangerLight,  desc: t('removeStockDesc') },
  { key: 'adjust', label: '⟳ ' + t('setQuantityLabel'), color: Colors.info,    bg: Colors.infoLight,    desc: t('setQuantityDesc') },
];

export default function AdjustStockScreen({ navigation, route }: any) {
  const item = route?.params?.item;
  const [form, setForm] = useState({ type: 'add', quantity: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const { t } = useLanguageStore();
  const ADJUST_TYPES = getAdjustTypes(t);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ {t('back')}</Text></TouchableOpacity>
          <Text style={styles.title}>{t('adjustStock')}</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textTertiary }}>{t('itemNotFound')}</Text>
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
    const qty = parseInt(form.quantity);
    if (!form.quantity.trim() || isNaN(qty)) {
      Alert.alert(t('error'), t('enterValidQty'));
      return;
    }
    if (qty < 0) {
      Alert.alert(t('error'), t('qtyCannotBeNegative'));
      return;
    }
    if ((form.type === 'add' || form.type === 'remove') && qty === 0) {
      Alert.alert(t('error'), t('enterQtyGreaterThanZero'));
      return;
    }
    const newQty = getNewQty();
    if (newQty < 0) {
      Alert.alert(t('error'), `${t('cannotRemoveMore')} (${currentQty} ${t('units')})`);
      return;
    }
    setLoading(true);
    try {
      await stockApi.adjust(item.id, {
        type: form.type,
        quantity: parseInt(form.quantity),
        notes: form.notes,
      });
      Alert.alert(`✅ ${t('stockUpdated')}`,
        `${item.name}\n${t('newQtyIs')}: ${newQty} ${t('units')}`,
        [{ text: t('done'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.error || t('failedAdjustStock'));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ {t('back')}</Text></TouchableOpacity>
          <Text style={styles.title}>{t('adjustStock')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Item summary */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSku}>{t('sku')}: {item.sku} · {item.category}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('currentStock')}</Text>
                <Text style={[styles.statValue, { color: currentQty === 0 ? Colors.danger : currentQty <= (item.reorderLevel || 10) ? Colors.warning : Colors.success }]}>
                  {currentQty} {t('units')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('reorderAt')}</Text>
                <Text style={styles.statValue}>{item.reorderLevel ?? item.reorder_level ?? 10} {t('units')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('costPrice')}</Text>
                <Text style={styles.statValue}>{fmtKip(costPrice)}</Text>
              </View>
            </View>
          </View>

          {/* Adjustment type */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('adjustmentType')}</Text>
            {ADJUST_TYPES.map(at => (
              <TouchableOpacity
                key={at.key}
                style={[styles.typeRow, form.type === at.key && { backgroundColor: at.bg, borderColor: at.color }]}
                onPress={() => setForm(p => ({ ...p, type: at.key }))}
              >
                <View style={[styles.typeRadio, form.type === at.key && { borderColor: at.color }]}>
                  {form.type === at.key && <View style={[styles.typeRadioDot, { backgroundColor: at.color }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, form.type === at.key && { color: at.color }]}>{at.label}</Text>
                  <Text style={styles.typeDesc}>{at.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>
              {form.type === 'adjust' ? `📊 ${t('setNewTotalQty')}` : form.type === 'add' ? `📥 ${t('howManyAdd')}` : `📤 ${t('howManyRemove')}`}
            </Text>
            <Input
              label={form.type === 'adjust' ? t('newTotalQtyLabel') : (form.type === 'add' ? t('qtyToAdd') : t('qtyToRemove'))}
              placeholder={form.type === 'add' ? 'e.g. 5' : form.type === 'remove' ? 'e.g. 2' : 'e.g. 10'}
              value={form.quantity}
              onChangeText={q => setForm(p => ({ ...p, quantity: q }))}
              keyboardType="numeric"
              autoFocus
            />
            {form.quantity ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>
                  {form.type === 'adjust' ? `${t('newQuantityColon')}` : form.type === 'add' ? `${currentQty} + ${form.quantity} =` : `${currentQty} - ${form.quantity} =`}
                </Text>
                <Text style={[styles.previewValue, { color: getNewQty() <= 0 ? Colors.danger : Colors.success }]}>
                  {getNewQty()} {t('units')}
                </Text>
              </View>
            ) : null}
            <Input
              label={t('reasonNotes')}
              placeholder={t('reasonNotesPlaceholder')}
              value={form.notes}
              onChangeText={n => setForm(p => ({ ...p, notes: n }))}
              multiline
              numberOfLines={2}
            />
          </View>

          <Button title={t('confirmAdjustment')} onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
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
