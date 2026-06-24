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
import { useLanguageStore } from '../store/languageStore';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtKip = (v: any) => {
  const n = parseFloat(String(v || 0));
  if (isNaN(n)) return '₭0';
  return '₭' + Math.round(n).toLocaleString('en-US');
};

const fmtDate = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch { return '—'; }
};

const fmtDateTime = (s: any) => {
  try {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    return `${date}  ${time}`;
  } catch { return '—'; }
};

export default function ReceiptScreen({ navigation, route }: any) {
  const invoice   = route?.params?.invoice;
  const billRef   = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguageStore();

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('Noinvoice')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSm}>
            <Text style={styles.backBtnSmText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Normalise fields ────────────────────────────────────────────────
  const invoiceNum   = invoice.invoiceNumber   || invoice.invoice_number  || '—';
  const customerName = invoice.customerName    || invoice.customer_name   || '—';
  const customerPhone= invoice.customerPhone   || invoice.customer_phone  || '';
  const make         = invoice.make            || '';
  const model        = invoice.model           || '';
  const licensePlate = invoice.licensePlate    || invoice.license_plate   || '';
  const createdAt    = invoice.createdAt       || invoice.created_at;
  const status       = invoice.status          || 'draft';
  const items: any[] = invoice.items           || invoice.line_items      || [];
  const subtotal     = parseFloat(String(invoice.subtotalAmount || invoice.subtotal_amount || invoice.totalAmount || invoice.total_amount || 0));
  const taxAmount    = parseFloat(String(invoice.taxAmount      || invoice.tax_amount      || 0));
  const discount     = parseFloat(String(invoice.discountAmount || invoice.discount_amount || 0));
  const total        = parseFloat(String(invoice.totalAmount    || invoice.total_amount    || 0));
  const paidAmount   = parseFloat(String(invoice.paidAmount     || invoice.paid_amount     || 0));
  const taxRate      = invoice.taxRate         || invoice.tax_rate        || 0;
  const balance      = total - paidAmount;
  const isPaid       = status === 'paid';
  const isPartial    = status === 'partial';
  const notes        = invoice.notes           || '';

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to save the receipt.');
        return;
      }
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Receipt saved to your Photos.');
    } catch (e) {
      Alert.alert('Error', 'Could not save image.');
      console.error(e);
    } finally { setSaving(false); }
  };

  // ── Share ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Receipt ${invoiceNum}` });
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // ── Dashed separator ────────────────────────────────────────────────
  const DashedLine = () => (
    <View style={styles.dashedRow}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('receiptbill')}</Text>
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

        {/* ── RECEIPT (captured as image) ── */}
        <ViewShot ref={billRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.receipt}>

            {/* Header */}
            <View style={styles.receiptHeader}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>🔧</Text>
              </View>
              <Text style={styles.shopName}>Sam Saen Thai KT Sole Co., Ltd.,</Text>
              <Text style={styles.shopTagline}>Professional Car Care</Text>
              <Text style={styles.shopSub}>Thank you for your business!</Text>
            </View>

            <DashedLine />

            {/* Receipt meta */}
            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Receipt No.</Text>
                <Text style={styles.metaValue}>{invoiceNum}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('date')}</Text>
                <Text style={styles.metaValue}>{fmtDateTime(createdAt)}</Text>
              </View>
            </View>

            <DashedLine />

            {/* Customer */}
            <View style={styles.customerBlock}>
              <Text style={styles.blockLabel}>{t('customers')}</Text>
              <Text style={styles.customerNameText}>{customerName}</Text>
              {customerPhone ? <Text style={styles.customerDetail}>{customerPhone}</Text> : null}
              {make ? (
                <Text style={styles.customerDetail}>
                  {make} {model}{licensePlate ? ` · ${licensePlate}` : ''}
                </Text>
              ) : null}
            </View>

            <DashedLine />

            {/* Line items */}
            <View style={styles.itemsBlock}>
              <Text style={styles.blockLabel}>ITEMS</Text>
              {items.length > 0
                ? items.map((it: any, idx: number) => {
                    const qty   = parseFloat(String(it.quantity || it.qty || 1));
                    const price = parseFloat(String(it.unitPrice || it.unit_price || 0));
                    const amt   = qty * price;
                    const desc  = it.description || it.name || '—';
                    return (
                      <View key={idx} style={styles.lineItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lineDesc}>{desc}</Text>
                          {qty !== 1 && (
                            <Text style={styles.lineQty}>{qty} × {fmtKip(price)}</Text>
                          )}
                        </View>
                        <Text style={styles.lineAmt}>{fmtKip(amt)}</Text>
                      </View>
                    );
                  })
                : <Text style={styles.noItems}>No items listed</Text>
              }
            </View>

            <DashedLine />

            {/* Totals */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('subtotal')}</Text>
                <Text style={styles.totalVal}>{fmtKip(subtotal)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('discount')}</Text>
                  <Text style={[styles.totalVal, { color: '#059669' }]}>-{fmtKip(discount)}</Text>
                </View>
              )}
              {taxAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('tax')} ({taxRate}%)</Text>
                  <Text style={styles.totalVal}>{fmtKip(taxAmount)}</Text>
                </View>
              )}
            </View>

            {/* Grand total box */}
            <View style={styles.grandBox}>
              <Text style={styles.grandLabel}>{t('total')}</Text>
              <Text style={styles.grandAmt}>{fmtKip(total)}</Text>
            </View>

            {/* Paid / Balance */}
            {paidAmount > 0 && (
              <View style={styles.paymentBlock}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { fontWeight: '600' }]}>Amount Paid</Text>
                  <Text style={[styles.totalVal, { color: '#059669', fontWeight: '700' }]}>{fmtKip(paidAmount)}</Text>
                </View>
                {!isPaid && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { fontWeight: '600' }]}>{t('balanceDue')}</Text>
                    <Text style={[styles.totalVal, { color: '#dc2626', fontWeight: '700' }]}>{fmtKip(balance)}</Text>
                  </View>
                )}
              </View>
            )}

            <DashedLine />

            {/* PAID stamp or BALANCE DUE */}
            {isPaid ? (
              <View style={styles.paidStampBox}>
                <View style={styles.paidStamp}>
                  <Text style={styles.paidStampCheck}>✓</Text>
                  <Text style={styles.paidStampText}>{t('paid')}</Text>
                </View>
                <Text style={styles.paidStampSub}>Payment received in full</Text>
              </View>
            ) : isPartial ? (
              <View style={styles.partialStampBox}>
                <View style={styles.partialStamp}>
                  <Text style={styles.partialStampText}>{t('partialPayment')}</Text>
                </View>
                <Text style={styles.partialStampSub}>Balance of {fmtKip(balance)} remaining</Text>
              </View>
            ) : (
              <View style={styles.unpaidStampBox}>
                <View style={styles.unpaidStamp}>
                  <Text style={styles.unpaidStampText}>{t('paymentDue')}</Text>
                </View>
                <Text style={styles.unpaidStampSub}>Amount due: {fmtKip(total)}</Text>
              </View>
            )}

            {/* Notes */}
            {notes ? (
              <>
                <DashedLine />
                <View style={styles.notesBlock}>
                  <Text style={styles.blockLabel}>NOTE</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              </>
            ) : null}

            <DashedLine />

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <Text style={styles.footerLine}>★ ★ ★</Text>
              <Text style={styles.footerText}>Thank you for choosing Auto Garage!</Text>
              <Text style={styles.footerSub}>Please retain this receipt for your records.</Text>
              <Text style={styles.footerTimestamp}>{new Date().toLocaleString()}</Text>
            </View>

          </View>
        </ViewShot>

        {/* Bottom action buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.btnShare} onPress={handleShare} disabled={saving}>
            <Text style={styles.btnShareText}>📤 {t('ShareReceipt')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnSaveText}>💾  {t('saveToPhotos')}</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0f4f8' },
  scroll:       { padding: 16, paddingBottom: 60 },

  // Top bar
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { paddingRight: 12 },
  backBtnText:  { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  topTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  topActions:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn:      { padding: 8, borderRadius: 10, backgroundColor: Colors.surfaceSecondary },
  iconBtnText:  { fontSize: 15 },
  saveBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 14 },

  // Receipt paper
  receipt:      { backgroundColor: '#fff', borderRadius: 4, overflow: 'hidden', ...Shadow.md },

  // Header
  receiptHeader:{ alignItems: 'center', paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20 },
  logoCircle:   { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoEmoji:    { fontSize: 28 },
  shopName:     { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: 2, marginBottom: 4 },
  shopTagline:  { fontSize: 12, color: '#64748b', marginBottom: 4 },
  shopSub:      { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  // Dashed line
  dashedRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginVertical: 12 },
  dash:         { width: 6, height: 1.5, backgroundColor: '#cbd5e1' },

  // Meta
  metaBlock:    { paddingHorizontal: 20, gap: 6 },
  metaRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel:    { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  metaValue:    { fontSize: 11, color: '#334155', fontWeight: '700' },

  // Customer
  customerBlock:{ paddingHorizontal: 20, gap: 4 },
  blockLabel:   { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 6 },
  customerNameText: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  customerDetail:   { fontSize: 12, color: '#64748b' },

  // Line items
  itemsBlock:   { paddingHorizontal: 20 },
  lineItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  lineDesc:     { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  lineQty:      { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  lineAmt:      { fontSize: 13, fontWeight: '700', color: '#334155' },
  noItems:      { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },

  // Totals
  totalsBlock:  { paddingHorizontal: 20, gap: 8 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:   { fontSize: 13, color: '#64748b' },
  totalVal:     { fontSize: 13, color: '#334155' },

  // Grand total
  grandBox:     { marginHorizontal: 20, marginVertical: 12, backgroundColor: '#1e293b', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel:   { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  grandAmt:     { fontSize: 22, fontWeight: '900', color: '#fff' },

  // Payment breakdown
  paymentBlock: { paddingHorizontal: 20, gap: 8, marginBottom: 4 },

  // PAID stamp
  paidStampBox:     { alignItems: 'center', paddingVertical: 16 },
  paidStamp:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 3, borderColor: '#059669', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  paidStampCheck:   { fontSize: 22, color: '#059669', fontWeight: '900' },
  paidStampText:    { fontSize: 24, fontWeight: '900', color: '#059669', letterSpacing: 3 },
  paidStampSub:     { fontSize: 11, color: '#94a3b8', marginTop: 6 },

  // PARTIAL stamp
  partialStampBox:  { alignItems: 'center', paddingVertical: 16 },
  partialStamp:     { borderWidth: 3, borderColor: '#d97706', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  partialStampText: { fontSize: 18, fontWeight: '900', color: '#d97706', letterSpacing: 2 },
  partialStampSub:  { fontSize: 11, color: '#94a3b8', marginTop: 6 },

  // UNPAID stamp
  unpaidStampBox:   { alignItems: 'center', paddingVertical: 16 },
  unpaidStamp:      { borderWidth: 3, borderColor: '#dc2626', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  unpaidStampText:  { fontSize: 18, fontWeight: '900', color: '#dc2626', letterSpacing: 2 },
  unpaidStampSub:   { fontSize: 11, color: '#94a3b8', marginTop: 6 },

  // Notes
  notesBlock:   { paddingHorizontal: 20 },
  notesText:    { fontSize: 12, color: '#475569', lineHeight: 18 },

  // Footer
  receiptFooter:{ alignItems: 'center', paddingVertical: 20, gap: 4 },
  footerLine:   { fontSize: 14, color: '#cbd5e1', letterSpacing: 4 },
  footerText:   { fontSize: 12, color: '#475569', fontWeight: '600' },
  footerSub:    { fontSize: 10, color: '#94a3b8' },
  footerTimestamp: { fontSize: 9, color: '#cbd5e1', marginTop: 4 },

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
