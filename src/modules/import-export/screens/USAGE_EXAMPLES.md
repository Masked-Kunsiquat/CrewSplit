# Import/Export Screens - Usage Examples

This document provides examples of how to use the Import/Export UI screens in CrewSplit.

## ImportExportScreen

The `ImportExportScreen` is a dedicated screen for import/export operations. It can be accessed from the main menu or settings using expo-router's file-based routing.

### Basic Usage with File-Based Routing

Create a route file at `app/import-export.tsx` (or `app/(tabs)/import-export.tsx` if using tab navigation):

```typescript
// app/import-export.tsx
import { ImportExportScreen } from '@modules/import-export';

// Expo Router automatically uses the default export as the screen component
export default ImportExportScreen;

// Optional: Configure screen options
export const options = {
  title: "Import & Export",
  headerShown: true,
};
```

### Navigating to Import/Export Screen

Use expo-router's navigation to push to the screen:

```typescript
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';

// Option 1: Using router.push()
function SettingsMenu() {
  const router = useRouter();

  return (
    <Button
      title="Import/Export"
      onPress={() => router.push('/import-export')}
    />
  );
}

// Option 2: Using Link component
function SettingsMenu() {
  return (
    <Link href="/import-export" asChild>
      <Button title="Import/Export" />
    </Link>
  );
}
```

### Navigation with Trip Context

If you want to navigate to the screen from within a trip (to enable the "Export Current Trip" button):

```typescript
import { useRouter } from 'expo-router';

function TripDashboard({ tripId }: { tripId: string }) {
  const router = useRouter();

  const handleOpenImportExport = () => {
    router.push({
      pathname: '/import-export',
      params: { tripId },
    });
  };

  return (
    <Button
      title="Import/Export"
      onPress={handleOpenImportExport}
    />
  );
}
```

### Features Available

**Export Section:**
- Export Current Trip (only visible when `tripId` param is provided)
- Export Full Database (always available)
- Options:
  - Include Sample Data (toggle)
  - Include Archived Data (toggle)

**Import Section:**
- Import from File (opens file picker)
- Warning message about duplicate handling

**Loading States:**
- Shows spinner overlay during operations
- Disables all buttons during operations
- Success/error alerts are handled by the hooks

## SettingsExportSection

The `SettingsExportSection` is a compact component designed to be embedded in a Settings screen.

### Basic Usage

```typescript
import { SettingsExportSection } from '@modules/import-export';

function SettingsScreen() {
  return (
    <ScrollView>
      {/* Other settings sections */}

      {/* Backup & Restore Section */}
      <SettingsExportSection />

      {/* More settings */}
    </ScrollView>
  );
}
```

### With Callbacks

You can provide callbacks to be notified when operations complete:

```typescript
import { SettingsExportSection } from '@modules/import-export';
import { Alert } from 'react-native';

function SettingsScreen() {
  const handleExportComplete = () => {
    console.log('Backup created successfully');
    // Could refresh UI, update badge count, etc.
  };

  const handleImportComplete = () => {
    console.log('Data restored successfully');
    Alert.alert(
      'Restart Required',
      'Please restart the app for changes to take full effect.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Settings */}
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        {/* ... account settings ... */}
      </Card>

      {/* Backup & Restore */}
      <SettingsExportSection
        onExportComplete={handleExportComplete}
        onImportComplete={handleImportComplete}
      />

      {/* Other Settings */}
      <Card>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {/* ... preferences ... */}
      </Card>
    </ScrollView>
  );
}
```

### Features Available

- **Backup Database** button: Creates full database export with archived data
- **Restore from Backup** button: Opens file picker to import
- Loading states during operations
- Informational tip about backups

## Standalone Hook Usage

If you need custom UI, you can use the hooks directly:

```typescript
import { useExport, useImport } from '@modules/import-export';

function CustomExportButton({ tripId }: { tripId: string }) {
  const { exportTrip, isExporting } = useExport();

  const handleExport = async () => {
    await exportTrip(tripId, {
      includeSampleData: false,
      includeArchivedData: false,
    });
  };

  return (
    <Button
      title={isExporting ? "Exporting..." : "Export Trip"}
      onPress={handleExport}
      disabled={isExporting}
      loading={isExporting}
    />
  );
}
```

## Complete Example: Settings Screen Integration

Here's a complete example of a Settings screen with the export section:

```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@ui/theme';
import { Card, Button } from '@ui/components';
import { SettingsExportSection } from '@modules/import-export';

export default function SettingsScreen() {
  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* App Info */}
        <Card>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Version</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
        </Card>

        {/* Backup & Restore Section */}
        <SettingsExportSection />

        {/* Preferences */}
        <Card>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {/* ... other settings ... */}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
});
```

## User Flow Examples

### Scenario 1: User Wants to Backup Data

1. User navigates to Settings screen
2. Scrolls to "Backup & Restore" section
3. Taps "Backup Database" button
4. Button shows loading state ("Creating Backup...")
5. Native share dialog appears with the backup file
6. User saves/shares the file
7. Success alert appears
8. `onExportComplete` callback fires (if provided)

### Scenario 2: User Wants to Share a Trip

1. User is viewing a trip dashboard
2. Taps "Import/Export" menu option
3. ImportExportScreen opens with trip context
4. User adjusts options (e.g., excludes sample data)
5. Taps "Export Trip" button
6. Native share dialog appears
7. User shares file via email/messaging app
8. Success alert confirms export

### Scenario 3: User Wants to Restore from Backup

1. User navigates to Import/Export screen
2. Scrolls to "Import" section
3. Reads warning about duplicate handling
4. Taps "Choose File" button
5. File picker opens
6. User selects a backup JSON file
7. Import processes with loading overlay
8. Success alert shows import summary (X records imported, Y skipped)

## Error Handling

Both screens handle errors gracefully:

- **Export errors**: Alert with error message (e.g., "Export Failed - Could not access file system")
- **Import errors**: Alert with error message (e.g., "Import Failed - Invalid file format")
- **Validation errors**: Detailed import summary shows which records failed and why

All alerts are managed by the hooks (`useExport` and `useImport`), so you don't need to implement error handling in the UI layer.

## Accessibility

Both screens follow CrewSplit's accessibility standards:

- All buttons have `accessibilityLabel` and `accessibilityHint`
- Touch targets meet 44x44pt minimum
- Screen reader support with meaningful labels
- Loading states announced to screen readers
- High contrast colors for visibility

## Testing Recommendations

Key user flows to test:

1. **Export trip data**: Verify file is created and shareable
2. **Export full database**: Verify all data is included
3. **Toggle options**: Ensure options affect export content
4. **Import valid file**: Verify data is imported correctly
5. **Import duplicate data**: Verify duplicates are skipped
6. **Import invalid file**: Verify error is shown gracefully
7. **Cancel operations**: Ensure app doesn't crash if user cancels file picker
8. **Loading states**: Verify buttons disable during operations
9. **Success feedback**: Verify alerts appear after operations
10. **Screen reader**: Test with TalkBack/VoiceOver enabled
