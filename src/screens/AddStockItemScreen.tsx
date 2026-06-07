import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stockApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const CATEGORIES = ['parts','oils','filters','tires','tools','supplies','other'];

export default function AddStockItemScreen({ navigation, route }: any) {
  // Support both Add and Edit modes
  const existingItem = route?.params?.item;
  const isEditing = !!existingItem;

  const [form, setForm] = useState({
    name: existingItem?.name || '',
    sku: existingItem?.sku || '',
    category: existingItem?.category || 'parts',
    supplier: existingItem?.supplier || '',
    quantity: isEditing ? String(existingItem?.quantity ?? '') : '',
    reorderLevel: String(existingItem?.reorderLevel ?? existingItem?.reorder_level ?? '10'),
    costPrice: String(existingItem?.costPrice ?? existingItem?.cost_price ?? ''),
    sellingPrice: String(existingItem?.sellingPrice ?? existingItem?.selling_price ?? ''),
    location: existingItem?.location || '',
    notes: existingItem?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (!isEditing && (!form.quantity || isNaN(Number(form.quantity)))) e.quantity = 'Valid quantity required';
    if (!form.costPrice || isNaN(Number(form.costPrice))) e.costPrice = 'Valid cost price required';
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Valid selling price required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = {
        name: form.name,
        sku: form.sku.toUpperCase(),
        category: form.category,
        supplier: form.supplier,
        reorderLevel: parseInt(form.reorderLevel) || 10,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        location: form.location,
        notes: form.notes,
      };

      if (isEditing) {
        // Update existing item
        await stockApi.update(existingItem.id, data);
        Alert.alert('✅ Updated!', `${form.name} has been updated successfully.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new item
        await stockApi.create({
          ...data,
          quantity: parseInt(form.quantity),
        });
        Alert.alert('✅ Added!', `${form.name} has been added to inventory.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || (isEditing ? 'Failed to update item' : 'Failed to add item');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? '✏️ Edit Item' : '+ Add Stock Item'}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Item Details */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Item Details</Text>
            <Input
              label="Item Name *"
              placeholder="e.g. Synthetic Motor Oil 5W-30"
              value={form.name}
              onChangeText={set('name')}
              error={errors.name}
            />
            <Input
              label="SKU *"
              placeholder="e.g. OIL-5W30-001"
              value={form.sku}
              onChangeText={set('sku')}
              error={errors.sku}
              autoCapitalize="characters"
            />
            <Input
              label="Supplier"
              placeholder="e.g. Mobil 1"
              value={form.supplier}
              onChangeText={set('supplier')}
            />
            <Input
              label="Storage Location"
              placeholder="e.g. Shelf A-3"
              value={form.location}
              onChangeText={set('location')}
            />
          </View>

          {/* Category */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, form.category === cat && styles.catBtnActive]}
                  onPress={() => setForm(prev => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.catBtnText, form.category === cat && styles.catBtnTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stock & Pricing */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Stock & Pricing</Text>
            {!isEditing && (
              <Input
                label="Initial Quantity *"
                placeholder="0"
                value={form.quantity}
                onChangeText={set('quantity')}
                keyboardType="numeric"
                error={errors.quantity}
              />
            )}
            {isEditing && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>ℹ️ Current Quantity: <Text style={styles.infoValue}>{existingItem?.quantity} units</Text></Text>
                <Text style={styles.infoText}>Use the <Text style={styles.infoValue}>⚙️ Adjust</Text> button to change quantity.</Text>
              </View>
            )}
            <Input
              label="Reorder Level"
              placeholder="10"
              value={form.reorderLevel}
              onChangeText={set('reorderLevel')}
              keyboardType="numeric"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Cost Price (₭) *"
                  placeholder="0"
                  value={form.costPrice}
                  onChangeText={set('costPrice')}
                  keyboardType="numeric"
                  error={errors.costPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Selling Price (₭) *"
                  placeholder="0"
                  value={form.sellingPrice}
                  onChangeText={set('sellingPrice')}
                  keyboardType="numeric"
                  error={errors.sellingPrice}
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Input
              label="Notes (optional)"
              placeholder="Any additional notes..."
              value={form.notes}
              onChangeText={set('notes')}
              multiline
              numberOfLines={3}
            />
          </View>

          <Button
            title={isEditing ? '💾 Save Changes' : '+ Add to Inventory'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginBottom: 40 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.base },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border,
  },
  catBtnActive: { backgroundColor: Colors.primaryAlpha, borderColor: Colors.primary },
  catBtnText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  catBtnTextActive: { color: Colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  infoBox: {
    backgroundColor: Colors.infoLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md, gap: 4,
  },
  infoText: { fontSize: Typography.sm, color: Colors.info },
  infoValue: { fontWeight: '700' },
});
