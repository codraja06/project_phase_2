import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './ui/Button';
export function RequestError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Reports unavailable</Text>
    <Text accessibilityRole="alert" style={{ textAlign: 'center', color: '#475569' }}>{message}</Text>
    <Button title="Retry" onPress={onRetry} />
  </View>;
}
