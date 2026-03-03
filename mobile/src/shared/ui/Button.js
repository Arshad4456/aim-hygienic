import React from 'react';
import { Pressable, Text } from 'react-native';
import colors from '../theme/colors';

export default function Button({ title, onPress }) { return <Pressable onPress={onPress} style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 12 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{title}</Text></Pressable>; }
