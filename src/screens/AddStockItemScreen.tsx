import { useLanguageStore } from '../store/languageStore';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Image, Modal, FlatList, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { stockApi, supplierApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';
import { Supplier } from '../types';

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
    supplierId:   existingItem?.supplierId    || null as string | null,
    quantity:     isEditing ? String(existingItem?.quantity ?? '') : '',
    reorderLevel: String(existingItem?.reorderLevel ?? existingItem?.reorder_level ?? '10'),
    costPrice:    String(existingItem?.costPrice ?? existingItem?.cost_price ?? ''),
    sellingPrice: String(existingItem?.sellingPrice ?? existingItem?.selling_price ?? ''),
    location:     existingItem?.location     || '',
    notes:        existingItem?.notes        || '',
  });
  const { t } = useLanguageStore();
  const [imageUri, setImageUri]   = useState<string | null>(existingItem?.imageUrl || existingItem?.image_url || null);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);

  // ── Supplier picker ──────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierName, setSelectedSupplierName] = useState(existingItem?.supplierName || '');
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  useEffect(() => {
    supplierApi.getAll({ isActive: 'true' })
      .then(res => setSuppliers(res.data.suppliers || []))
      .catch(err => console.error('Fetch suppliers error:', err));
  }, []);

  const filteredSuppliers = suppliers.filter(s =>
    s.companyName.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const selectSupplier = (supplier: Supplier | null) => {
    setForm(prev => ({ ...prev, supplierId: supplier?.id || null }));
    setSelectedSupplierName(supplier?.companyName || '');
    setSupplierModalVisible(false);
    setSupplierSearch('');
  };

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
    Alert.alert(t('itemPhoto'), 'Choose how to add a photo', [
      { text: t('takePhoto'),      onPress: pickFromCamera  },
      { text: t('chooseFromLibrary'), onPress: pickFromLibrary },
      ...(imageUri ? [{ text: t('removePhoto'), style: 'destructive' as const, onPress: () => setImageUri(null) }] : []),
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
      // Only treat as a new image if it's actually a local device URI.
      // Existing server images come back as relative paths (/uploads/...)
      // or full http URLs — neither should trigger an upload.
      const hasNewImage = !!imageUri && (
        imageUri.startsWith('file://') ||
        imageUri.startsWith('content://')
      );

      if (hasNewImage) {
        // Resolve content:// → file:// so the native uploader can read it
        let uploadUri = imageUri!;
        if (!uploadUri.startsWith('file://')) {
          const dest = FileSystem.cacheDirectory + `stock_${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: uploadUri, to: dest });
          uploadUri = dest;
        }

        // Read the auth token directly — FileSystem.uploadAsync bypasses axios
        const SecureStore = await import('expo-secure-store');
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) throw new Error('Not logged in. Please log out and back in.');

        const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const url = isEditing
          ? `${API_BASE}/stock/${existingItem.id}`
          : `${API_BASE}/stock`;

        // FileSystem.uploadAsync uses the native HTTP stack with proper
        // multipart boundary handling — far more reliable than axios/fetch
        // for FormData uploads on Android.
        const result = await FileSystem.uploadAsync(url, uploadUri, {
          httpMethod:  isEditing ? 'PUT' : 'POST',
          uploadType:  FileSystem.FileSystemUploadType.MULTIPART,
          fieldName:   'image',
          headers:     { Authorization: `Bearer ${token}` },
          parameters:  {
            name:         form.name,
            sku:          form.sku.toUpperCase(),
            category:     form.category,
            supplierId:   form.supplierId || '',
            reorderLevel: String(parseInt(form.reorderLevel) || 10),
            costPrice:    String(parseFloat(form.costPrice)),
            sellingPrice: String(parseFloat(form.sellingPrice)),
            location:     form.location,
            notes:        form.notes,
            ...(!isEditing ? { quantity: String(parseInt(form.quantity)) } : {}),
          },
        });

        if (result.status >= 400) {
          const body = JSON.parse(result.body || '{}');
          throw new Error(body?.error || `Upload failed (${result.status})`);
        }
      } else {
        // No new image — use regular JSON
        const data: any = {
          name:         form.name,
          sku:          form.sku.toUpperCase(),
          category:     form.category,
          supplierId:   form.supplierId || null,
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
      console.error('AddStockItemScreen submit error:', error);
      const msg = error?.response?.data?.error
        || error?.message
        || (isEditing ? 'Failed to update item' : 'Failed to add item');
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
            <Text style={styles.backBtn}>‹ {t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? t('editItem') : t('addItem')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Photo picker ── */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('itemPhoto')}</Text>
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
            <Text style={styles.sectionTitle}>{t('ItemDetails')}</Text>
            <Input label={`${t('itemName')} *`} placeholder="e.g. Synthetic Motor Oil 5W-30" value={form.name} onChangeText={set('name')} error={errors.name} />
            <Input label={`${t('sku')} *`} placeholder="e.g. OIL-5W30-001" value={form.sku} onChangeText={set('sku')} error={errors.sku} autoCapitalize="characters" />

            <Text style={styles.inputLabel}>{t('supplier')}</Text>
            <TouchableOpacity
              style={styles.supplierField}
              onPress={() => setSupplierModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={selectedSupplierName ? styles.supplierFieldText : styles.supplierFieldPlaceholder}>
                {selectedSupplierName || t('selectSupplier')}
              </Text>
              <Text style={styles.supplierFieldChevron}>▾</Text>
            </TouchableOpacity>

            <Input label={t('location')} placeholder="e.g. Shelf A-3" value={form.location} onChangeText={set('location')} />
          </View>

          {/* Category */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('category')}</Text>
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
            <Text style={styles.sectionTitle}>{t('StockPricing')}</Text>
            {!isEditing && (
              <Input label={`${t('initialQuantity')} *`} placeholder="0" value={form.quantity} onChangeText={set('quantity')} keyboardType="numeric" error={errors.quantity} />
            )}
            {isEditing && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>ℹ️ {t('currentQuantity')}: <Text style={styles.infoValue}>{existingItem?.quantity} units</Text></Text>
                <Text style={styles.infoText}>Use the <Text style={styles.infoValue}>⚙️ Adjust</Text> button to change quantity.</Text>
              </View>
            )}
            <Input label={t('reorderLevel')} placeholder="10" value={form.reorderLevel} onChangeText={set('reorderLevel')} keyboardType="numeric" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label={`${t('costPrice')} (₭)`} placeholder="0" value={form.costPrice} onChangeText={set('costPrice')} keyboardType="numeric" error={errors.costPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={`${t('sellingPrice')} (₭)`}  placeholder="0" value={form.sellingPrice} onChangeText={set('sellingPrice')} keyboardType="numeric" error={errors.sellingPrice} />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>{t('notes')}</Text>
            <Input label={t('Noteoptional')} placeholder={t('additionalnotes')} value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />
          </View>

          <Button
            title={isEditing ? t('saveChanges') : t('addToInventory')}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginBottom: 40 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={supplierModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSupplierModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectSupplier')}</Text>
              <TouchableOpacity onPress={() => setSupplierModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder={t('search')}
              placeholderTextColor={Colors.textTertiary}
              value={supplierSearch}
              onChangeText={setSupplierSearch}
            />

            <TouchableOpacity style={styles.modalNoneRow} onPress={() => selectSupplier(null)}>
              <Text style={styles.modalNoneText}>{t('noSupplier')}</Text>
            </TouchableOpacity>

            <FlatList
              data={filteredSuppliers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalRow} onPress={() => selectSupplier(item)}>
                  <Text style={styles.modalRowText}>{item.companyName}</Text>
                  {item.contactPerson ? <Text style={styles.modalRowSub}>{item.contactPerson}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>{t('noSuppliers')}</Text>
              }
              style={{ maxHeight: 320 }}
            />
          </View>
        </View>
      </Modal>
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

  // Supplier picker field
  inputLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  supplierField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: 13, marginBottom: Spacing.md,
  },
  supplierFieldText: { fontSize: Typography.base, color: Colors.textPrimary },
  supplierFieldPlaceholder: { fontSize: Typography.base, color: Colors.textTertiary },
  supplierFieldChevron: { fontSize: Typography.base, color: Colors.textTertiary },

  // Supplier picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.base, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { fontSize: Typography.lg, color: Colors.textSecondary, padding: 4 },
  modalSearch: { backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: Typography.base, color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalNoneRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalNoneText: { fontSize: Typography.base, color: Colors.textSecondary, fontStyle: 'italic' },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalRowText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  modalRowSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  modalEmptyText: { textAlign: 'center', color: Colors.textTertiary, paddingVertical: Spacing.lg },
});
