import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { stockApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

const CATEGORIES = ['parts','oils','filters','tires','tools','supplies','other'];

const CATEGORY_ICONS: Record<string, string> = {
  parts: '🔩', oils: '🛢️', filters: '🌀',
  tires: '🛞', tools: '🔧', supplies: '📦', other: '📋',
};

export default function AddStockItemScreen({ navigation, route }: any) {
  const existingItem = route?.params?.item;
  const isEditing = !!existingItem;

  const [form, setForm] = useState({
    name:         existingItem?.name         || '',
    sku:          existingItem?.sku          || '',
    category:     existingItem?.category     || 'parts',
    supplier:     existingItem?.supplier     || '',
    quantity:     isEditing ? String(existingItem?.quantity ?? '') : '',
    reorderLevel: String(existingItem?.reorderLevel ?? existingItem?.reorder_level ?? '10'),
    costPrice:    String(existingItem?.costPrice ?? existingItem?.cost_price ?? ''),
    sellingPrice: String(existingItem?.sellingPrice ?? existingItem?.selling_price ?? ''),
    location:     existingItem?.location     || '',
    notes:        existingItem?.notes        || '',
  });
  const [imageUri, setImageUri]   = useState<string | null>(existingItem?.imageUrl || existingItem?.image_url || null);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);

  const set = (key: string) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── Image picker ─────────────────────────────────────────────────
  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return false;
      }
    }
    return true;
  };

  const pickFromCamera = async () => {
    if (!(await requestPermission('camera'))) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    if (!(await requestPermission('library'))) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: '📷 Take Photo',      onPress: pickFromCamera  },
      { text: '🖼️ Choose from Library', onPress: pickFromLibrary },
      ...(imageUri ? [{ text: '🗑️ Remove Photo', style: 'destructive' as const, onPress: () => setImageUri(null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Validation ───────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name = 'Name is required';
    if (!form.sku.trim())   e.sku  = 'SKU is required';
    if (!isEditing && (!form.quantity || isNaN(Number(form.quantity)))) e.quantity = 'Valid quantity required';
    if (!form.costPrice    || isNaN(Number(form.costPrice)))    e.costPrice    = 'Valid cost price required';
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Valid selling price required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const hasNewImage = imageUri && imageUri.startsWith('file');

      if (hasNewImage) {
        // Use FormData only when a new local image is attached
        const formData = new FormData();
        formData.append('name',         form.name);
        formData.append('sku',          form.sku.toUpperCase());
        formData.append('category',     form.category);
        formData.append('supplier',     form.supplier);
        formData.append('reorderLevel', String(parseInt(form.reorderLevel) || 10));
        formData.append('costPrice',    String(parseFloat(form.costPrice)));
        formData.append('sellingPrice', String(parseFloat(form.sellingPrice)));
        formData.append('location',     form.location);
        formData.append('notes',        form.notes);
        if (!isEditing) formData.append('quantity', String(parseInt(form.quantity)));

        const filename  = imageUri.split('/').pop() || 'photo.jpg';
        const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType  = extension === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('image', { uri: imageUri, name: filename, type: mimeType } as any);

        if (isEditing) {
          await stockApi.updateWithImage(existingItem.id, formData);
        } else {
          await stockApi.createWithImage(formData);
        }
      } else {
        // No new image — use regular JSON
        const data: any = {
          name:         form.name,
          sku:          form.sku.toUpperCase(),
          category:     form.category,
          supplier:     form.supplier,
          reorderLevel: parseInt(form.reorderLevel) || 10,
          costPrice:    parseFloat(form.costPrice),
          sellingPrice: parseFloat(form.sellingPrice),
          location:     form.location,
          notes:        form.notes,
        };
        if (!isEditing) data.quantity = parseInt(form.quantity);

        if (isEditing) {
          await stockApi.update(existingItem.id, data);
        } else {
          await stockApi.create(data);
        }
      }

      Alert.alert(
        isEditing ? '✅ Updated!' : '✅ Added!',
        isEditing ? `${form.name} has been updated.` : `${form.name} has been added to inventory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
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

          {/* ── Photo picker ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Item Photo</Text>
            <TouchableOpacity style={styles.photoBox} onPress={showImageOptions} activeOpacity={0.8}>
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
                  <View style={styles.photoEditBadge}>
                    <Text style={styles.photoEditBadgeText}>✏️ Change</Text>
                  </View>
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
                  <Text style={styles.photoPlaceholderSub}>Camera or Photo Library</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Item Details */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Item Details</Text>
            <Input label="Item Name *" placeholder="e.g. Synthetic Motor Oil 5W-30" value={form.name} onChangeText={set('name')} error={errors.name} />
            <Input label="SKU *" placeholder="e.g. OIL-5W30-001" value={form.sku} onChangeText={set('sku')} error={errors.sku} autoCapitalize="characters" />
            <Input label="Supplier" placeholder="e.g. Mobil 1" value={form.supplier} onChangeText={set('supplier')} />
            <Input label="Storage Location" placeholder="e.g. Shelf A-3" value={form.location} onChangeText={set('location')} />
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
                  <Text style={styles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
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
              <Input label="Initial Quantity *" placeholder="0" value={form.quantity} onChangeText={set('quantity')} keyboardType="numeric" error={errors.quantity} />
            )}
            {isEditing && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>ℹ️ Current Quantity: <Text style={styles.infoValue}>{existingItem?.quantity} units</Text></Text>
                <Text style={styles.infoText}>Use the <Text style={styles.infoValue}>⚙️ Adjust</Text> button to change quantity.</Text>
              </View>
            )}
            <Input label="Reorder Level" placeholder="10" value={form.reorderLevel} onChangeText={set('reorderLevel')} keyboardType="numeric" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Cost Price (₭) *" placeholder="0" value={form.costPrice} onChangeText={set('costPrice')} keyboardType="numeric" error={errors.costPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Selling Price (₭) *" placeholder="0" value={form.sellingPrice} onChangeText={set('sellingPrice')} keyboardType="numeric" error={errors.sellingPrice} />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Input label="Notes (optional)" placeholder="Any additional notes..." value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />
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
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:    { fontSize: Typography.base, color: Colors.primary, fontWeight: '600' },
  title:      { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  content:    { padding: Spacing.base },
  card:       { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  // Photo
  photoBox:           { borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, overflow: 'hidden', height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSecondary },
  photoPreview:       { width: '100%', height: '100%' },
  photoEditBadge:     { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  photoEditBadgeText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  photoPlaceholder:   { alignItems: 'center', gap: 8 },
  photoPlaceholderIcon: { fontSize: 40 },
  photoPlaceholderText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textSecondary },
  photoPlaceholderSub:  { fontSize: Typography.xs, color: Colors.textTertiary },

  // Category
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  catBtnActive: { backgroundColor: Colors.primaryAlpha, borderColor: Colors.primary },
  catIcon:      { fontSize: 14 },
  catBtnText:   { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  catBtnTextActive: { color: Colors.primary },

  row:      { flexDirection: 'row', gap: 12 },
  infoBox:  { backgroundColor: Colors.infoLight, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: 4 },
  infoText: { fontSize: Typography.sm, color: Colors.info },
  infoValue:{ fontWeight: '700' },
});
