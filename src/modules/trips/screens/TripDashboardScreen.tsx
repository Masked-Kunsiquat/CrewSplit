import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import EmojiPicker from 'rn-emoji-keyboard';
import { theme } from '@ui/theme';
import { Button, Card, Input, DatePicker } from '@ui/components';
import { useTripById } from '../hooks/use-trips';
import { useParticipants } from '../../participants/hooks/use-participants';
import { useExpenses } from '../../expenses/hooks/use-expenses';
import { updateTrip, deleteTrip } from '../repository';
import { formatCurrency } from '@utils/currency';
import { useRefreshControl } from '@hooks/use-refresh-control';

export default function TripDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;

  if (!tripId) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Invalid trip. Please select a trip again.</Text>
          <Button title="Back to trips" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  return <TripDashboardScreenContent tripId={tripId} />;
}

function TripDashboardScreenContent({ tripId }: { tripId: string }) {
  const router = useRouter();
  const navigation = useNavigation();

  const { trip, loading: tripLoading, error: tripError, refetch: refetchTrip } = useTripById(tripId);
  const { participants, loading: participantsLoading, refetch: refetchParticipants } = useParticipants(tripId ?? null);
  const { expenses, loading: expensesLoading, refetch: refetchExpenses } = useExpenses(tripId ?? null);

  // Pull-to-refresh support
  const refreshControl = useRefreshControl([refetchTrip, refetchParticipants, refetchExpenses]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState<string | undefined>(undefined);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [endDateInput, setEndDateInput] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update native header title when trip loads
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: trip.name,
      });
    }
  }, [trip, navigation]);

  const loading = tripLoading || participantsLoading || expensesLoading;

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.convertedAmountMinor, 0);

  const handleEditName = () => {
    setNameInput(trip?.name || '');
    setEmojiInput(trip?.emoji);
    setEndDateInput(trip?.endDate ? new Date(trip.endDate) : null);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Trip name cannot be empty');
      return;
    }

    if (endDateInput && trip && endDateInput < new Date(trip.startDate)) {
      Alert.alert('Invalid Dates', 'End date must be on or after the start date.');
      return;
    }

    try {
      const updated = await updateTrip(tripId, {
        name: nameInput.trim(),
        emoji: emojiInput,
        endDate: endDateInput ? endDateInput.toISOString() : null,
      });
      navigation.setOptions({ title: updated.name });
      refetchTrip();
      setEditingName(false);
      // Trip will refresh automatically via hook
    } catch (error) {
      Alert.alert('Error', 'Failed to update trip');
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput('');
    setEmojiInput(undefined);
    setEndDateInput(null);
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      `Delete "${trip?.name}"? This will permanently delete all participants, expenses, and settlements for this trip. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteTrip(tripId);
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (tripError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{tripError.message}</Text>
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

  const startDateLabel = new Date(trip.startDate).toLocaleDateString();
  const endDateLabel = trip.endDate ? new Date(trip.endDate).toLocaleDateString() : null;
  const dateRangeLabel = endDateLabel ? `${startDateLabel} - ${endDateLabel}` : startDateLabel;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {editingName ? (
          <Card style={styles.editCard}>
            <Input
              label="Trip name"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />

            <View style={styles.emojiRow}>
              <Text style={styles.editLabel}>Trip Emoji (optional)</Text>
              <View style={styles.emojiControls}>
                <TouchableOpacity
                  style={styles.emojiEditButtonCompact}
                  onPress={() => setEmojiPickerOpen(true)}
                >
                  <Text style={styles.emojiEditText}>{emojiInput || '➕'}</Text>
                </TouchableOpacity>
                {emojiInput && (
                  <TouchableOpacity
                    onPress={() => setEmojiInput(undefined)}
                    style={styles.clearEmojiButtonInline}
                  >
                    <Text style={styles.clearEmojiText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Start Date (cannot be changed)</Text>
              <Text style={styles.dateValue}>
                {trip ? new Date(trip.startDate).toLocaleDateString() : ''}
              </Text>
            </View>

            {endDateInput ? (
              <DatePicker
                label="End Date (optional)"
                value={endDateInput}
                onChange={setEndDateInput}
                minimumDate={trip ? new Date(trip.startDate) : undefined}
              />
            ) : (
              <View>
                <Text style={styles.dateLabel}>End Date (optional)</Text>
                <TouchableOpacity
                  style={styles.addEndDateButton}
                  onPress={() => setEndDateInput(trip ? new Date(trip.startDate) : new Date())}
                >
                  <Text style={styles.addEndDateText}>+ Add end date</Text>
                </TouchableOpacity>
              </View>
            )}

            {endDateInput && (
              <TouchableOpacity
                onPress={() => setEndDateInput(null)}
                style={styles.clearEndDateButton}
              >
                <Text style={styles.clearEndDateText}>Clear end date</Text>
              </TouchableOpacity>
            )}

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
            <View style={styles.headerMain}>
              {trip.emoji && <Text style={styles.headerEmoji}>{trip.emoji}</Text>}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{trip.name}</Text>
                <Text style={styles.subtitle}>{trip.currency}</Text>
                <Text style={[styles.subtitle, styles.dateLine]}>{dateRangeLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleEditName}
              style={styles.editButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Edit trip name"
              accessibilityHint="Opens the edit screen for the trip name"
            >
              <Text style={styles.editButtonText}>✏️</Text>
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
          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${tripId}/participants`)}>
            <Text style={styles.actionTitle}>Participants</Text>
            <Text style={styles.actionBody}>
              {participants.length === 0
                ? 'Add participants to track who shares expenses'
                : `Manage ${participants.length} participant${participants.length !== 1 ? 's' : ''}`}
            </Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${tripId}/expenses`)}>
            <Text style={styles.actionTitle}>Expenses</Text>
            <Text style={styles.actionBody}>
              {expenses.length === 0
                ? 'No expenses yet - add your first expense'
                : `View ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
            </Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${tripId}/settlement`)}>
            <Text style={styles.actionTitle}>Settlement</Text>
            <Text style={styles.actionBody}>
              {expenses.length === 0
                ? 'Settlement will appear once expenses are added'
                : 'View who owes whom'}
            </Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${tripId}/statistics`)}>
            <Text style={styles.actionTitle}>Statistics</Text>
            <Text style={styles.actionBody}>
              {expenses.length === 0
                ? 'Statistics will appear once expenses are added'
                : 'View trip insights and breakdowns'}
            </Text>
          </Card>
        </View>

        {editingName && (
          <Card style={styles.deleteCard}>
            <Text style={styles.deleteWarning}>Danger Zone</Text>
            <Text style={styles.deleteDescription}>
              Deleting this trip will permanently remove all participants, expenses, and settlement data.
            </Text>
            <Button
              title={isDeleting ? 'Deleting...' : 'Delete Trip'}
              onPress={handleDeleteTrip}
              fullWidth
              disabled={isDeleting}
            />
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Add Expense" onPress={() => router.push(`/trips/${tripId}/expenses/add`)} fullWidth />
      </View>

      <EmojiPicker
        onEmojiSelected={(emojiObject) => {
          setEmojiInput(emojiObject.emoji);
          setEmojiPickerOpen(false);
        }}
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        enableSearchBar
        theme={{
          backdrop: '#0a0a0a88',
          knob: theme.colors.primary,
          container: theme.colors.surface,
          header: theme.colors.text,
          skinTonesContainer: theme.colors.surfaceElevated,
          category: {
            icon: theme.colors.primary,
            iconActive: theme.colors.text,
            container: theme.colors.surfaceElevated,
            containerActive: theme.colors.primary,
          },
          search: {
            text: theme.colors.text,
            placeholder: theme.colors.textMuted,
            icon: theme.colors.textSecondary,
            background: theme.colors.surfaceElevated,
          },
        }}
      />
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
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 48,
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
  dateLine: {
    marginTop: theme.spacing.xs / 2,
  },
  editButton: {
    padding: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  editCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  editLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emojiControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emojiEditButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  emojiEditButtonCompact: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiEditText: {
    fontSize: 32,
    color: theme.colors.text,
  },
  clearEmojiButton: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-end',
  },
  clearEmojiButtonInline: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  clearEmojiText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
  },
  dateSection: {
    gap: theme.spacing.xs,
  },
  dateLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
  },
  dateValue: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  addEndDateButton: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  addEndDateText: {
    fontSize: theme.typography.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.medium,
  },
  clearEndDateButton: {
    alignSelf: 'flex-start',
  },
  clearEndDateText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.medium,
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
  deleteCard: {
    backgroundColor: '#1a0000',
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  deleteWarning: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  deleteDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
    textAlign: 'center',
  },
});
