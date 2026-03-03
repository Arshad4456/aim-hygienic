import React from 'react';
import { Text, View } from 'react-native';

export default function EmptyState({ text = 'No data found.' }) { return <View style={{ padding: 20 }}><Text>{text}</Text></View>; }
