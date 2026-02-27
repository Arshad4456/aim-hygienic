import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/useAuth';
import { getRoleMenu } from '../../navigation/RoleMenuConfig';
import Card from '../../ui/Card';
import { colors } from '../../theme/colors';

export default function DashboardHome({ navigation }) {
  const { user, role } = useAuth();
  const menu = getRoleMenu(role);

  return (
    <View style={styles.content}>
      <Card>
        <Text style={styles.title}>Welcome, {user?.fullName || user?.name || 'User'}</Text>
        <Text style={styles.subtitle}>Role: {role || 'Unknown'}</Text>
      </Card>
      <View style={styles.grid}>
        {menu.map((item) => (
          <Pressable key={item} style={styles.tile} onPress={() => navigation.navigate(item)}>
            <Text style={styles.tileText}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 6, color: colors.subtext },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  tileText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});