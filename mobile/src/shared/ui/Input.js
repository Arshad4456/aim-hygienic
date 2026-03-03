import React from 'react';
import { TextInput } from 'react-native';

export default function Input(props) { return <TextInput {...props} style={[{ borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, padding: 10, marginTop: 6 }, props.style]} />; }
