import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ListRow({ title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', padding: 12 },
  title: { color: '#18181b', fontWeight: '600' },
  subtitle: { color: '#71717a', marginTop: 3, fontSize: 12 },
});
