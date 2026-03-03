import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ListRow({ title, subtitle, onPress }) { return <Pressable onPress={onPress} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' }}><Text style={{ fontWeight: '600' }}>{title}</Text>{subtitle ? <Text>{subtitle}</Text> : null}</Pressable>; }
