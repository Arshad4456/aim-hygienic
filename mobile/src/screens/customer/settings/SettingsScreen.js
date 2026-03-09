import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../api/client';
import Card from '../../../ui/Card';
import Loader from '../../../ui/Loader';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) return;
      setLoading(true);
      setErr('');
      try {
        const data = await apiClient.get('/users/me');
        if (!mounted) return;
        setUser(data?.data?.user || null);
      } catch (error) {
        if (!mounted) return;
        setErr(error.message || 'Failed to load account settings');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Loader />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Customer Account Settings</Text>
            <Text style={styles.subtitle}>Your profile data is read-only here.</Text>
          </View>
          <Pressable
            style={styles.changePasswordBtn}
            onPress={() => navigation?.navigate?.('customer:settings/change-password')}
          >
            <Text style={styles.changePasswordBtnText}>Change Password</Text>
          </Pressable>
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        {!err ? (
          <View style={styles.formGrid}>
            <ReadOnly label="Username" value={user?.username} />
            <ReadOnly label="Role" value={user?.role} />
            <ReadOnly label="Full Name" value={user?.fullName} />
            <ReadOnly label="Business Name" value={user?.businessName} />
            <ReadOnly label="Email" value={user?.email} />
            <ReadOnly label="Mobile" value={user?.mobile} />
            <View style={styles.fullWidthField}>
              <ReadOnly label="Address" value={user?.address} />
            </View>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function ReadOnly({ label, value }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 26 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  headerTextWrap: { flex: 1, minWidth: 190 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  changePasswordBtn: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  changePasswordBtnText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  err: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  formGrid: { marginTop: 12, gap: 10 },
  fullWidthField: { width: '100%' },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3f3f46' },
  readOnlyBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  readOnlyText: { fontSize: 13, color: '#18181b' },
});