import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ModuleGrid({ modules = [], onPress }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{modules.map((m) => <Pressable key={m.routeName} style={{ width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 }} onPress={() => onPress(m)}><Text style={{ fontWeight: '600' }}>{m.title}</Text></Pressable>)}</View>;
}
