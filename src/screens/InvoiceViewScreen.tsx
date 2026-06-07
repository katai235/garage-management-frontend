import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

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

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  paid:      { bg: '#d1fae5', text: '#065f46', label: 'PAID' },
  unpaid:    { bg: '#fee2e2', text: '#991b1b', label: 'UNPAID' },
  partial:   { bg: '#fef3c7', text: '#92400e', label: 'PARTIAL' },
  draft:     { bg: '#f1f5f9', text: '#475569', label: 'DRAFT' },
  cancelled: { bg: '#f1f5f9', text: '#94a3b8', label: 'CANCELLED' },
};

export default function InvoiceViewScreen({ navigation, route }: any) {
  const invoice = route?.params?.invoice;
  const billRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>No invoice data found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSm}>
            <Text style={styles.backBtnSmText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Normalise fields
  const invoiceNum    = invoice.invoiceNumber   || invoice.invoice_number  || '—';
  const customerName  = invoice.customerName    || invoice.customer_name   || '—';
  const customerPhone = invoice.customerPhone   || invoice.customer_phone  || '';
  const make          = invoice.make            || '';
  const model         = invoice.model           || '';
  const licensePlate  = invoice.licensePlate    || invoice.license_plate   || '';
  const createdAt     = invoice.createdAt       || invoice.created_at;
  const dueDate       = invoice.dueDate         || invoice.due_date;
  const status        = invoice.status          || 'draft';
  const notes         = invoice.notes           || '';
  const items: any[]  = invoice.items           || invoice.line_items      || [];
  const subtotal      = parseFloat(String(invoice.subtotalAmount || invoice.subtotal_amount || invoice.totalAmount || invoice.total_amount || 0));
  const taxAmount     = parseFloat(String(invoice.taxAmount      || invoice.tax_amount      || 0));
  const discount      = parseFloat(String(invoice.discountAmount || invoice.discount_amount || 0));
  const total         = parseFloat(String(invoice.totalAmount    || invoice.total_amount    || 0));
  const paidAmount    = parseFloat(String(invoice.paidAmount     || invoice.paid_amount     || 0));
  const balance       = total - paidAmount;
  const taxRate       = invoice.taxRate         || invoice.tax_rate         || 0;
  const badge         = statusColors[status]    || statusColors.draft;

  // ─── Save to gallery ───────────────────────────────────────────────────────
  const handleSaveImage = async () => {
    try {
      const { status: permStatus } = await MediaLibrary.requestPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to save the bill.');
        return;
      }
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'Bill saved to your Photos.');
    } catch (e) {
      Alert.alert('Error', 'Could not save image. Please try again.');
      console.error(e);
    } finally { setSaving(false); }
  };

  // ─── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      setSaving(true);
      const uri = await captureRef(billRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Invoice ${invoiceNum}` });
      } else {
        await Share.share({ message: `Invoice ${invoiceNum} — Total: ${fmtKip(total)}` });
      }
    } catch (e) {
      console.error(e);
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Invoice</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare} disabled={saving}>
            <Text style={styles.iconBtnText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.saveBtn]} onPress={handleSaveImage} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.iconBtnText, { color: '#fff' }]}>💾 Save</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ─── BILL (captured as image) ─── */}
        <ViewShot ref={billRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.bill}>

            {/* Garage header */}
            <View style={styles.billHeader}>
              <View style={styles.garageLogo}>
                <Text style={styles.garageLogoText}>🔧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.garageName}>Sam Saen Thai KT Sole Co., Ltd.,</Text>
                <Text style={styles.garageTagline}>Professional Car Care</Text>
              </View>
              <View style={[styles.statusStamp, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusStampText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>

            {/* Thin colour bar */}
            <View style={styles.accentBar} />

            {/* Invoice meta */}
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>Invoice #</Text>
                <Text style={styles.metaValue}>{invoiceNum}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{fmtDate(createdAt)}</Text>
                {dueDate ? <>
                  <Text style={[styles.metaLabel, { marginTop: 6 }]}>Due Date</Text>
                  <Text style={[styles.metaValue, { color: Colors.danger }]}>{fmtDate(dueDate)}</Text>
                </> : null}
              </View>
            </View>

            {/* Customer + Vehicle */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>BILL TO</Text>
              <Text style={styles.customerNameBill}>{customerName}</Text>
              {customerPhone ? <Text style={styles.customerDetail}>📞 {customerPhone}</Text> : null}
              {make ? <Text style={styles.customerDetail}>🚗 {make} {model}{licensePlate ? `  |  ${licensePlate}` : ''}</Text> : null}
            </View>

            {/* Line items table */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHead, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableHead, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHead, { flex: 2, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.tableHead, { flex: 2, textAlign: 'right' }]}>Amount</Text>
            </View>

            {items.length > 0
              ? items.map((it: any, idx: number) => {
                  const qty      = parseFloat(String(it.quantity   || it.qty  || 1));
                  const price    = parseFloat(String(it.unitPrice  || it.unit_price || 0));
                  const lineAmt  = qty * price;
                  const desc     = it.description || it.name || '—';
                  const type     = it.type || '';
                  return (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <View style={{ flex: 3 }}>
                        <Text style={styles.tableCell}>{desc}</Text>
                        {type ? <Text style={styles.tableCellSub}>{type}</Text> : null}
                      </View>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                      <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>{fmtKip(price)}</Text>
                      <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: '700' }]}>{fmtKip(lineAmt)}</Text>
                    </View>
                  );
                })
              : (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { color: Colors.textTertiary }]}>No line items</Text>
                </View>
              )
            }

            {/* Totals */}
            <View style={styles.totalsBlock}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Subtotal</Text>
                <Text style={styles.totalLineValue}>{fmtKip(subtotal)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLineLabel}>Discount</Text>
                  <Text style={[styles.totalLineValue, { color: Colors.success }]}>-{fmtKip(discount)}</Text>
                </View>
              )}
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Tax ({taxRate}%)</Text>
                <Text style={styles.totalLineValue}>{fmtKip(taxAmount)}</Text>
              </View>
              <View style={styles.grandLine}>
                <Text style={styles.grandLabel}>TOTAL</Text>
                <Text style={styles.grandValue}>{fmtKip(total)}</Text>
              </View>
              {paidAmount > 0 && (
                <>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>Paid</Text>
                    <Text style={[styles.totalLineValue, { color: Colors.success }]}>{fmtKip(paidAmount)}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={[styles.totalLineLabel, { fontWeight: '700' }]}>Balance Due</Text>
                    <Text style={[styles.totalLineValue, { color: Colors.danger, fontWeight: '700' }]}>{fmtKip(balance)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Notes */}
            {notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            ) : null}

            {/* Footer */}
            <View style={styles.billFooter}>
              <Text style={styles.footerText}>Thank you for choosing our services!</Text>
              <Text style={styles.footerSub}>Please retain this invoice for your records.</Text>
            </View>
          </View>
        </ViewShot>

        {/* Action buttons below the bill */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.btnShare} onPress={handleShare} disabled={saving}>
            <Text style={styles.btnShareText}>📤  Share Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={handleSaveImage} disabled={saving}>
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
  container:        { flex: 1, backgroundColor: '#f0f4f8' },
  scroll:           { padding: 16, paddingBottom: 60 },

  // Top bar
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:          { paddingRight: 12 },
  backBtnText:      { fontSize: 17, color: Colors.primary, fontWeight: '600' },
  topTitle:         { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  topActions:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn:          { padding: 8, borderRadius: 10, backgroundColor: Colors.surfaceSecondary },
  iconBtnText:      { fontSize: 15 },
  saveBtn:          { backgroundColor: Colors.primary, paddingHorizontal: 14 },

  // Bill card
  bill:             { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Shadow.md },

  billHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 16 },
  garageLogo:       { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  garageLogoText:   { fontSize: 22 },
  garageName:       { fontSize: 17, fontWeight: '900', color: '#1e293b', letterSpacing: 1.5 },
  garageTagline:    { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusStamp:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusStampText:  { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  accentBar:        { height: 3, backgroundColor: '#1e293b' },

  metaRow:          { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc' },
  metaLabel:        { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  metaValue:        { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 2 },

  section:          { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionLabel:     { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 6 },
  customerNameBill: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  customerDetail:   { fontSize: 12, color: '#64748b', marginTop: 3 },

  // Table
  tableHeader:      { flexDirection: 'row', backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10 },
  tableHead:        { fontSize: 10, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.5 },
  tableRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowAlt:      { backgroundColor: '#f8fafc' },
  tableCell:        { fontSize: 12, color: '#334155' },
  tableCellSub:     { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  // Totals
  totalsBlock:      { padding: 16, paddingBottom: 8, borderTopWidth: 2, borderTopColor: '#e2e8f0' },
  totalLine:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLineLabel:   { fontSize: 13, color: '#64748b' },
  totalLineValue:   { fontSize: 13, color: '#1e293b' },
  grandLine:        { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10, marginTop: 4 },
  grandLabel:       { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  grandValue:       { fontSize: 18, fontWeight: '900', color: '#fff' },

  notesBox:         { margin: 16, marginTop: 0, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#cbd5e1' },
  notesLabel:       { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
  notesText:        { fontSize: 12, color: '#475569', lineHeight: 18 },

  billFooter:       { alignItems: 'center', padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText:       { fontSize: 12, color: '#475569', fontWeight: '600' },
  footerSub:        { fontSize: 10, color: '#94a3b8', marginTop: 3 },

  // Bottom actions
  bottomActions:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnShare:         { flex: 1, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnShareText:     { fontSize: 14, fontWeight: '700', color: Colors.primary },
  btnSave:          { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnSaveText:      { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Error
  errorBox:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText:        { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  backBtnSm:        { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnSmText:    { color: '#fff', fontWeight: '700' },
});
