/**
 * TRIPS LAYOUT
 * Configure navigation for trips routes
 */

import { Stack } from 'expo-router';

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Trip',
          headerBackTitle: 'Trips',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerTitle: 'Create Trip',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]/participants"
        options={{
          headerTitle: 'Participants',
        }}
      />
      <Stack.Screen
        name="[id]/expenses"
        options={{
          headerTitle: 'Expenses',
        }}
      />
      <Stack.Screen
        name="[id]/expenses/add"
        options={{
          headerTitle: 'Add Expense',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]/expenses/[expenseId]"
        options={{
          headerTitle: 'Expense Details',
        }}
      />
      <Stack.Screen
        name="[id]/settlement"
        options={{
          headerTitle: 'Settlement',
        }}
      />
    </Stack>
  );
}
