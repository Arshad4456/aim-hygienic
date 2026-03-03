import React from 'react';
import { View } from 'react-native';

export default function Card({ children, style }) { return <View style={[{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 }, style]}>{children}</View>; }
