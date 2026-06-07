import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const fmtKip = (v: any) => {
  const n = parseFloat(String(v || 0));
  if (isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toLocaleString('en-US');
};

const fmtDate = (s?: string) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const STATUS_META: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  'in-stock':     { bg: '#d1fae5', text: '#065f46', label: 'In Stock',     icon: '✅' },
  'low-stock':    { bg: '#fef3c7', text: '#92400e', label: 'Low Stock',    icon: '⚠️' },
  'out-of-stock': { bg: '#fee2e2', text: '#991b1b', label: 'Out of Stock', icon: '❌' },
};

const CATEGORY_ICONS: Record<string, string> = {
  parts:    '🔩',
  oils:     '🛢️',
  filters:  '🌀',
  tires:    '🛞',
  tools:    '🔧',
  supplies: '📦',
  other:    '📋',
};

export default function StockItemViewScreen({ navigation, route }: any) {
  const item = route?.params?.item;
  const billRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>No item data found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSm}>
            <Text style={styles.backBtnSmText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Normalise fields
  const name          = item.name         || '—';
  const sku           = item.sku          || '—';
  const category      = item.category     || 'other';
  const supplier      = item.supplier     || '—';
  const quantity      = item.quantity     ?? 0;
  const reorderLevel  = item.reorderLevel ?? item.reorder_level ?? 0;
  const costPrice     = item.costPrice    ?? item.cost_price    ?? 0;
  const sellingPrice  = item.sellingPrice ?? item.selling_price ?? 0;
  const location      = item.location     || '—';
  const notes         = item.notes        || '';
  const status        = item.status       || 'in-stock';
  const createdAt     = item.createdAt    || item.created_at;
  const updatedAt     = item.updatedAt    || item.updated_at;
  const totalValue    = quantity * costPrice;
  const margin        = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100) : 0;

  const statusMeta   = STATUS_META[status]        || STATUS_META['in-stock'];
  const categoryIcon = CATEGORY_ICONS[category]   || '📋';

  // ── Save to gallery ──────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to save.');
        return;
      }
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Stock card saved to your Photos.');
    } catch (e) {
      Alert.alert('Error', 'Could not save image.');
      console.error(e);
    } finally { setSaving(false); }
  };

  // ── Share ────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Stock — ${name}` });
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Stock Card</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare} disabled={saving}>
            <Text style={styles.iconBtnText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.iconBtnText, { color: '#fff' }]}>💾 Save</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── CARD (captured as image) ── */}
        <ViewShot ref={billRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.card}>

            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={styles.garageRow}>
                <View style={styles.garageLogo}>
                  <Text style={styles.garageLogoText}>🔧</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.garageName}>Sam Saen Thai KT Sole Co., Ltd.,</Text>
                  <Text style={styles.garageTagline}>Stock & Inventory Record</Text>
                </View>
                <View style={[styles.statusStamp, { backgroundColor: statusMeta.bg }]}>
                  <Text style={styles.statusStampIcon}>{statusMeta.icon}</Text>
                  <Text style={[styles.statusStampText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                </View>
              </View>
              <View style={styles.accentBar} />
            </View>

            {/* Item identity */}
            <View style={styles.identityRow}>
              <View style={styles.categoryCircle}>
                <Text style={styles.categoryCircleIcon}>{categoryIcon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{name}</Text>
                <View style={styles.skuRow}>
                  <Text style={styles.skuLabel}>SKU</Text>
                  <Text style={styles.skuValue}>{sku}</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{category.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Stock levels */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>STOCK LEVELS</Text>
              <View style={styles.levelRow}>
                <View style={[styles.levelCard, { backgroundColor: quantity === 0 ? '#fee2e2' : quantity <= reorderLevel ? '#fef3c7' : '#d1fae5' }]}>
                  <Text style={styles.levelNum}>{quantity}</Text>
                  <Text style={styles.levelLbl}>Current Qty</Text>
                </View>
                <View style={[styles.levelCard, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={styles.levelNum}>{reorderLevel}</Text>
                  <Text style={styles.levelLbl}>Reorder At</Text>
                </View>
                <View style={[styles.levelCard, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.levelNum, { color: '#1d4ed8' }]}>{fmtKip(totalValue)}</Text>
                  <Text style={styles.levelLbl}>Stock Value</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Pricing */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRICING</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>Cost Price</Text>
                  <Text style={styles.priceCost}>{fmtKip(costPrice)}</Text>
                </View>
                <View style={styles.priceArrow}>
                  <Text style={styles.priceArrowText}>→</Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>Selling Price</Text>
                  <Text style={styles.priceSell}>{fmtKip(sellingPrice)}</Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.priceLabel}>Margin</Text>
                  <Text style={[styles.priceMargin, { color: margin >= 20 ? '#059669' : margin >= 10 ? '#d97706' : '#dc2626' }]}>
                    {margin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Details grid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
              <View style={styles.detailGrid}>
                {[
                  { label: 'Supplier',  value: supplier },
                  { label: 'Location',  value: location },
                  { label: 'Added',     value: fmtDate(createdAt) },
                  { label: 'Updated',   value: fmtDate(updatedAt) },
                ].map(d => (
                  <View key={d.label} style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                    <Text style={styles.detailValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Notes */}
            {notes ? (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>NOTES</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              </>
            ) : null}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Generated by Auto Garage Management System</Text>
              <Text style={styles.footerDate}>{new Date().toLocaleString()}</Text>
            </View>

          </View>
        </ViewShot>

        {/* Bottom action buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.btnShare} onPress={handleShare} disabled={saving}>
            <Text style={styles.btnShareText}>📤  Share Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnSaveText}>💾  Save to Photos</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4f8' },
  scroll:      { padding: 16, paddingBottom: 60 },

  // Top bar
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { paddingRight: 12 },
  backBtnText:  { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  topTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  topActions:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn:      { padding: 8, borderRadius: 10, backgroundColor: Colors.surfaceSecondary },
  iconBtnText:  { fontSize: 15 },
  saveBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 14 },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Shadow.md },

  // Header
  cardHeader:   { backgroundColor: '#fff' },
  garageRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 16 },
  garageLogo:   { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  garageLogoText: { fontSize: 22 },
  garageName:   { fontSize: 15, fontWeight: '900', color: '#1e293b', letterSpacing: 1.5 },
  garageTagline:{ fontSize: 11, color: '#64748b', marginTop: 2 },
  statusStamp:  { alignItems: 'center', padding: 8, borderRadius: 10, gap: 2 },
  statusStampIcon: { fontSize: 18 },
  statusStampText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  accentBar:    { height: 3, backgroundColor: '#1e293b' },

  // Identity
  identityRow:  { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center' },
  categoryCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  categoryCircleIcon: { fontSize: 26 },
  itemName:     { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  skuRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skuLabel:     { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8 },
  skuValue:     { fontSize: 12, fontWeight: '700', color: '#475569' },
  categoryPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  categoryPillText: { fontSize: 9, fontWeight: '800', color: '#0369a1', letterSpacing: 0.8 },

  divider:      { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },

  // Section
  section:      { padding: 16 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 12 },

  // Stock levels
  levelRow:     { flexDirection: 'row', gap: 8 },
  levelCard:    { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  levelNum:     { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  levelLbl:     { fontSize: 9, color: '#64748b', fontWeight: '600', textAlign: 'center' },

  // Pricing
  priceRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceCol:     { flex: 1, alignItems: 'center' },
  priceLabel:   { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  priceCost:    { fontSize: 14, fontWeight: '700', color: '#475569' },
  priceSell:    { fontSize: 16, fontWeight: '900', color: '#059669' },
  priceMargin:  { fontSize: 15, fontWeight: '900' },
  priceArrow:   { paddingHorizontal: 4 },
  priceArrowText: { fontSize: 18, color: '#cbd5e1' },

  // Details grid
  detailGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem:   { width: '45%' },
  detailLabel:  { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  detailValue:  { fontSize: 13, fontWeight: '600', color: '#334155' },

  // Notes
  notesText:    { fontSize: 12, color: '#475569', lineHeight: 18, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#cbd5e1' },

  // Footer
  cardFooter:   { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center', gap: 4 },
  footerText:   { fontSize: 10, color: '#94a3b8' },
  footerDate:   { fontSize: 10, color: '#cbd5e1' },

  // Bottom buttons
  bottomActions:{ flexDirection: 'row', gap: 12, marginTop: 16 },
  btnShare:     { flex: 1, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnShareText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  btnSave:      { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnSaveText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Error
  errorBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText:    { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  backBtnSm:    { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnSmText:{ color: '#fff', fontWeight: '700' },
});
