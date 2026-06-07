import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { invoiceApi, customerApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

interface LineItem { id: string; description: string; quantity: string; unitPrice: string; type: string; }

export default function AddInvoiceScreen({ navigation, route }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prefill = route?.params || {};
  const [form, setForm] = useState({
    customerId: prefill.customerId || '',
    customerName: prefill.customerName || '',
    taxRate: '7',
    discountAmount: '0',
    notes: prefill.vehicleInfo ? `Vehicle: ${prefill.vehicleInfo}` : '',
    dueDate: '',
  });
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: prefill.serviceDescription || '',
      quantity: '1',
      unitPrice: prefill.estimatedCost ? String(prefill.estimatedCost) : '',
      type: 'service',
    }
  ]);

  const searchCustomers = async (query: string) => {
    try { const res = await customerApi.getAll({ search: query }); setCustomers(res.data.customers || []); } catch (e) {}
  };

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerId: c.id, customerName: c.full_name || c.fullName }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), description: '', quantity: '1', unitPrice: '', type: 'service' }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const getSubtotal = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const getTotal = () => {
    const subtotal = getSubtotal();
    const discount = parseFloat(form.discountAmount) || 0;
    const tax = (subtotal - discount) * ((parseFloat(form.taxRate) || 0) / 100);
    return subtotal - discount + tax;
  };

  const formatCurrency = (v: number) => '₭' + v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customer = 'Please select a customer';
    if (items.some(i => !i.description || !i.unitPrice)) e.items = 'All items need a description and price';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const invoiceItems = items.map(i => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0,
        type: i.type,
      }));
      await invoiceApi.create({
        customerId: form.customerId,
        items: invoiceItems,
        taxRate: parseFloat(form.taxRate) || 7,
        discountAmount: parseFloat(form.discountAmount) || 0,
        notes: form.notes,
        dueDate: form.dueDate || null,
      });
      Alert.alert('Success', 'Invoice created!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create invoice');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>New Invoice</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Customer */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Customer *</Text>
            <TouchableOpacity style={[styles.selectBtn, errors.customer ? { borderColor: Colors.danger } : null]} onPress={() => setShowCustomerSearch(!showCustomerSearch)}>
              <Text style={form.customerName ? styles.selectText : styles.placeholderText}>{form.customerName || 'Tap to search customer...'}</Text>
            </TouchableOpacity>
            {errors.customer ? <Text style={styles.errorText}>{errors.customer}</Text> : null}
            {showCustomerSearch && (
              <View style={styles.dropdown}>
                <TextInput style={styles.dropdownInput} placeholder="Type name or phone..." placeholderTextColor={Colors.textTertiary} value={customerSearch} onChangeText={(t) => { setCustomerSearch(t); searchCustomers(t); }} autoFocus />
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                    <Text style={styles.dropdownItemName}>{c.full_name || c.fullName}</Text>
                    <Text style={styles.dropdownItemSub}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && customerSearch.length > 1 && <Text style={styles.noResult}>No customers found</Text>}
              </View>
            )}
          </View>

          {/* Line Items */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Line Items *</Text>
            {errors.items ? <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.items}</Text> : null}
            {items.map((item, index) => (
              <View key={item.id} style={styles.lineItem}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemNum}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                      <Text style={styles.removeBtn}>✕ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.itemTypeRow}>
                  {['service','part','labor'].map(t => (
                    <TouchableOpacity key={t} style={[styles.typeChip, item.type === t && styles.typeChipActive]} onPress={() => updateItem(item.id, 'type', t)}>
                      <Text style={[styles.typeChipText, item.type === t && styles.typeChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label="Description *" placeholder="e.g. Oil Change Service" value={item.description} onChangeText={v => updateItem(item.id, 'description', v)} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="Qty" placeholder="1" value={item.quantity} onChangeText={v => updateItem(item.id, 'quantity', v)} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Input label="Unit Price (₭) *" placeholder="0.00" value={item.unitPrice} onChangeText={v => updateItem(item.id, 'unitPrice', v)} keyboardType="decimal-pad" />
                  </View>
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalLabel}>Subtotal:</Text>
                  <Text style={styles.itemTotalValue}>{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Text style={styles.addItemBtnText}>+ Add Another Item</Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Tax Rate (%)" placeholder="7" value={form.taxRate} onChangeText={t => setForm(p => ({ ...p, taxRate: t }))} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Discount ($)" placeholder="0.00" value={form.discountAmount} onChangeText={t => setForm(p => ({ ...p, discountAmount: t }))} keyboardType="decimal-pad" />
              </View>
            </View>
            <Input label="Due Date (YYYY-MM-DD)" placeholder="Optional" value={form.dueDate} onChangeText={t => setForm(p => ({ ...p, dueDate: t }))} keyboardType="numeric" />
            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(getSubtotal())}</Text>
              </View>
              {parseFloat(form.discountAmount) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, { color: Colors.success }]}>-{formatCurrency(parseFloat(form.discountAmount) || 0)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({form.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency((getSubtotal() - (parseFloat(form.discountAmount) || 0)) * ((parseFloat(form.taxRate) || 0) / 100))}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(getTotal())}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Input label="Notes" placeholder="Invoice notes..." value={form.notes} onChangeText={t => setForm(p => ({ ...p, notes: t }))} multiline numberOfLines={3} />
          </View>

          <Button title="Create Invoice" onPress={handleSubmit} loading={loading} style={{ marginBottom: 40 }} />
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
  selectBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  selectText: { fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { fontSize: Typography.base, color: Colors.textTertiary },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  dropdownInput: { padding: Spacing.md, fontSize: Typography.base, color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSecondary },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  dropdownItemSub: { fontSize: Typography.sm, color: Colors.textSecondary },
  noResult: { padding: Spacing.md, color: Colors.textTertiary, textAlign: 'center', fontSize: Typography.sm },
  lineItem: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surfaceSecondary },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineItemNum: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary },
  removeBtn: { fontSize: Typography.xs, color: Colors.danger, fontWeight: '600' },
  itemTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha },
  typeChipText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  itemTotal: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  itemTotalLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  itemTotalValue: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  addItemBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: BorderRadius.md, padding: 12, alignItems: 'center', marginTop: 4 },
  addItemBtnText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primary },
  totalBox: { backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: Typography.base, color: Colors.textSecondary },
  totalValue: { fontSize: Typography.base, color: Colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  grandTotalValue: { fontSize: Typography.lg, fontWeight: '800', color: Colors.primary },
  errorText: { fontSize: Typography.xs, color: Colors.danger, marginTop: 4 },
});
