import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customerApi } from '../services/api';
import { Input, Button } from '../components/UI';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../utils/theme';

export default function AddCustomerScreen({ navigation, route }: any) {
  // Support both Add and Edit modes
  const existingCustomer = route?.params?.customer;
  const isEditing = !!existingCustomer;

  const [form, setForm] = useState({
    fullName: existingCustomer?.fullName || existingCustomer?.full_name || '',
    email: existingCustomer?.email || '',
    phone: existingCustomer?.phone || '',
    address: existingCustomer?.address || '',
    notes: existingCustomer?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEditing) {
        await customerApi.update(existingCustomer.id, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          status: existingCustomer.status || 'active',
        });
        Alert.alert('Success', 'Customer updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const result = await customerApi.create({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
        });
        Alert.alert('Success', 'Customer added successfully!', [
          { text: 'View Customer', onPress: () => navigation.replace('CustomerDetail', { customerId: result.data.id }) },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || (isEditing ? 'Failed to update customer' : 'Failed to add customer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Customer' : 'Add Customer'}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Input
              label="Full Name *"
              placeholder="John Doe"
              value={form.fullName}
              onChangeText={set('fullName')}
              error={errors.fullName}
              icon="👤"
              autoCapitalize="words"
            />
            <Input
              label="Phone Number *"
              placeholder="(555) 123-4567"
              value={form.phone}
              onChangeText={set('phone')}
              error={errors.phone}
              icon="📞"
              keyboardType="phone-pad"
            />
            <Input
              label="Email Address"
              placeholder="customer@example.com"
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              icon="✉️"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Address"
              placeholder="123 Main St, City, State ZIP"
              value={form.address}
              onChangeText={set('address')}
              icon="📍"
              multiline
            />
          </View>

          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Input
              label="Notes"
              placeholder="Any special notes about this customer..."
              value={form.notes}
              onChangeText={set('notes')}
              multiline
              numberOfLines={4}
            />
          </View>

          <Button
            title={isEditing ? 'Save Changes' : 'Add Customer'}
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
});
