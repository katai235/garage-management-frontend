import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supplierApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing } from '../utils/theme';
import { useLanguageStore } from '../store/languageStore';

export default function AddEditSupplierScreen({ navigation, route }: any) {
  const existing = route.params?.supplier;
  const isEdit = !!existing;
  const { t } = useLanguageStore();

  const [companyName, setCompanyName] = useState(existing?.companyName || '');
  const [contactPerson, setContactPerson] = useState(existing?.contactPerson || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [errors, setErrors] = useState<{ companyName?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!companyName.trim()) next.companyName = t('companyNameRequired');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('validEmail');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await supplierApi.update(existing.id, payload);
        Alert.alert(t('supplierUpdated'), '', [{ text: t('ok'), onPress: () => navigation.goBack() }]);
      } else {
        await supplierApi.create(payload);
        Alert.alert(t('supplierAdded'), '', [{ text: t('ok'), onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert(t('error'), isEdit ? t('failedUpdateSupplier') : t('failedAddSupplier'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEdit ? t('editSupplier') : t('addSupplier')}</Text>

        <Input
          label={t('companyName')}
          value={companyName}
          onChangeText={setCompanyName}
          error={errors.companyName}
          placeholder={t('companyNamePlaceholder')}
        />
        <Input
          label={t('contactPerson')}
          value={contactPerson}
          onChangeText={setContactPerson}
          placeholder={t('contactPersonPlaceholder')}
        />
        <Input
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t('address')}
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <Input
          label={t('Noteoptional')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {isEdit && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('active')}</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
          </View>
        )}

        <Button
          title={t('save')}
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  title: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  switchLabel: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
});
