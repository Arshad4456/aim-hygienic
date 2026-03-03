import React, { useState } from 'react';
import { Text, View } from 'react-native';
import useAuth from '../../auth/useAuth';
import Screen from '../../shared/components/Screen';
import Input from '../../shared/ui/Input';
import Button from '../../shared/ui/Button';

export default function LoginScreen() {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    try { await login(mobile, password); } catch (e) { setError(e.message || 'Login failed'); }
  };

  return (
    <Screen title="AIM ERP Login">
      <View style={{ gap: 10 }}>
        <Input value={mobile} onChangeText={setMobile} placeholder="Mobile" autoCapitalize="none" />
        <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
        <Button title="Login" onPress={onSubmit} />
      </View>
    </Screen>
  );
}
