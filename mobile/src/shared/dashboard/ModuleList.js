import React from 'react';
import { FlatList } from 'react-native';
import ListRow from '../ui/ListRow';

export default function ModuleList({ modules = [], onPress }) {
  return <FlatList data={modules} keyExtractor={(item) => item.routeName} renderItem={({ item }) => <ListRow title={item.title} onPress={() => onPress(item)} />} />;
}
