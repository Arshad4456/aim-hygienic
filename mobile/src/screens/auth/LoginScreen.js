import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppInput } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await login({ mobile: mobile.trim(), password });
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>AIM ERP Login</Text>
        <Text style={styles.subtitle}>Sign in with your mobile number and password.</Text>
        <AppInput
          label="Mobile Number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton label="Login" onPress={handleSubmit} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb', justifyContent: 'center', padding: 16 },
  container: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#616161', marginBottom: 18 }
});
