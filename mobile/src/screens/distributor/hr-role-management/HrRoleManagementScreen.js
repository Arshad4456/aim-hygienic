import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Card from '../../../ui/Card';

const roleOptions = [
  { key: 'salesman', label: 'Salesman' },
  { key: 'orderBooker', label: 'Order Booker' },
  { key: 'customer', label: 'Customer' },
];

const distributorTerritory = 'North Territory';

export default function HrRoleManagementScreen() {
  const [selectedRole, setSelectedRole] = useState(roleOptions[0].key);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState('');

  const selectedRoleLabel = useMemo(
    () => roleOptions.find((item) => item.key === selectedRole)?.label || 'Salesman',
    [selectedRole]
  );

  function submit() {
    if (!fullName.trim() || !phone.trim()) {
      setNotice('Please enter both name and phone number.');
      return;
    }

    setNotice(`${selectedRoleLabel} added for ${distributorTerritory}. Cross-territory assignment is blocked.`);
    setFullName('');
    setPhone('');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>HR & Role Management</Text>
        <Text style={styles.subtitle}>Add Salesman, Order Booker, and Customer within your own territory only.</Text>

        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Territory rule: You can only add users for your assigned territory.
          </Text>
        </View>

        <Text style={styles.label}>Select Role</Text>
        <View style={styles.roleWrap}>
          {roleOptions.map((role) => {
            const active = selectedRole === role.key;
            return (
              <Pressable
                key={role.key}
                style={[styles.roleChip, active ? styles.roleChipActive : null]}
                onPress={() => setSelectedRole(role.key)}
              >
                <Text style={[styles.roleChipText, active ? styles.roleChipTextActive : null]}>{role.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Territory</Text>
        <TextInput editable={false} value={distributorTerritory} style={[styles.input, styles.readOnly]} />

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder={`Enter ${selectedRoleLabel} full name`}
          placeholderTextColor="#71717a"
          style={styles.input}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          placeholderTextColor="#71717a"
          style={styles.input}
          keyboardType="phone-pad"
        />

        <Pressable style={styles.submit} onPress={submit}>
          <Text style={styles.submitText}>Add {selectedRoleLabel}</Text>
        </Pressable>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 13 },
  alertBox: { marginTop: 12, borderWidth: 1, borderColor: '#fcd34d', backgroundColor: '#fffbeb', borderRadius: 10, padding: 10 },
  alertText: { color: '#92400e', fontSize: 12, lineHeight: 18 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: '600', color: '#374151' },
  roleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d4d4d8', backgroundColor: '#fafafa' },
  roleChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  roleChipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  roleChipTextActive: { color: '#047857' },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  readOnly: { backgroundColor: '#f4f4f5', color: '#52525b' },
  submit: { marginTop: 14, borderRadius: 10, backgroundColor: '#059669', paddingVertical: 11, alignItems: 'center' },
  submitText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  notice: { marginTop: 10, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4', borderRadius: 10, color: '#166534', padding: 10, fontSize: 12, lineHeight: 18 },
});
