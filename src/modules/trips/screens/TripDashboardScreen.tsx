import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card, Input } from '@ui/components';
import { useTripById } from '../hooks/use-trips';
import { useParticipants } from '../../participants/hooks/use-participants';
import { useExpenses } from '../../expenses/hooks/use-expenses';
import { updateTrip } from '../repository';
import { formatCurrency } from '@utils/currency';

export default function TripDashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { trip, loading: tripLoading, error: tripError } = useTripById(id);
  const { participants, loading: participantsLoading } = useParticipants(id);
  const { expenses, loading: expensesLoading } = useExpenses(id);

  // Set dynamic header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        headerTitle: trip.name,
      });
    }
  }, [trip, navigation]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const loading = tripLoading || participantsLoading || expensesLoading;

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.convertedAmountMinor, 0);

  const handleEditName = () => {
    setNameInput(trip?.name || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Trip name cannot be empty');
      return;
    }

    try {
      await updateTrip(id, { name: nameInput.trim() });
      setEditingName(false);
      // Trip will refresh automatically via hook
    } catch (error) {
      Alert.alert('Error', 'Failed to update trip name');
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput('');
  };

  if (tripError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{tripError}</Text>
          </Card>
        </View>
      </View>
    );
  }

  if (loading || !trip) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {editingName ? (
          <Card style={styles.editCard}>
            <Input
              label="Trip name"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <View style={styles.buttonRow}>
              <View style={styles.buttonHalf}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleCancelEdit}
                  fullWidth
                />
              </View>
              <View style={styles.buttonHalf}>
                <Button
                  title="Save"
                  onPress={handleSaveName}
                  fullWidth
                />
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{trip.name}</Text>
              <Text style={styles.subtitle}>
                {trip.currency}
                {trip.endDate
                  ? ` • ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`
                  : ` • ${new Date(trip.startDate).toLocaleDateString()}`
                }
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditName} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Participants</Text>
            <Text style={styles.summaryValue}>{participants.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryValue}>{expenses.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses, trip.currency)}</Text>
          </View>
        </Card>

        <View style={styles.actionGrid}>
          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/participants`)}>
            <Text style={styles.actionTitle}>Participants</Text>
            <Text style={styles.actionBody}>
              {participants.length === 0
                ? 'Add participants to track who shares expenses'
                : `Manage ${participants.length} participant${participants.length !== 1 ? 's' : ''}`}
            </Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/expenses`)}>
            <Text style={styles.actionTitle}>Expenses</Text>
            <Text style={styles.actionBody}>
              {expenses.length === 0
                ? 'No expenses yet - add your first expense'
                : `View ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
            </Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/settlement`)}>
            <Text style={styles.actionTitle}>Settlement</Text>
            <Text style={styles.actionBody}>
              {expenses.length === 0
                ? 'Settlement will appear once expenses are added'
                : 'View who owes whom'}
            </Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Add Expense" onPress={() => router.push(`/trips/${id}/expenses/add`)} fullWidth />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  editButton: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  editCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: theme.spacing.lg,
  },
  errorCard: {
    backgroundColor: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.background,
  },
  summaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  actionGrid: {
    gap: theme.spacing.md,
  },
  actionCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  actionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionBody: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
