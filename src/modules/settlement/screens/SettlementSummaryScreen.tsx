import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Card, Button } from '@ui/components';

export default function SettlementSummaryScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const mockSettlement = [
    { from: 'Cam', to: 'Alex', amount: '$18.00' },
    { from: 'Bailey', to: 'Alex', amount: '$12.00' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settlement</Text>
        <Text style={styles.subtitle}>Trip: {tripId}</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            Deterministic balances and transaction minimization will render here. These rows are
            mock data to keep navigation flowing.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Who owes whom</Text>
          {mockSettlement.map((item) => (
            <View key={`${item.from}-${item.to}`} style={styles.settlementRow}>
              <Text style={styles.settlementText}>
                <Text style={styles.from}>{item.from}</Text>
                <Text style={styles.arrow}> → </Text>
                <Text style={styles.to}>{item.to}</Text>
              </Text>
              <Text style={styles.amount}>{item.amount}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Audit trail</Text>
          <Text style={styles.placeholderText}>
            Normalized shares, paid vs. benefited deltas, and receipts will be shown once the math
            engine is wired.
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Export (mock)" variant="outline" onPress={() => {}} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  placeholderCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  section: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    flex: 1,
  },
  from: {
    fontWeight: theme.typography.semibold,
  },
  arrow: {
    color: theme.colors.textMuted,
  },
  to: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
