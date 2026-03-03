import React from 'react';
import { FlatList, Text } from 'react-native';

export default function TableList({ rows = [] }) { return <FlatList data={rows} keyExtractor={(_,i)=>String(i)} renderItem={({item}) => <Text>{JSON.stringify(item)}</Text>} />; }
