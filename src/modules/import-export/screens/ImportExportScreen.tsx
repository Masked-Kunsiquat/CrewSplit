/**
 * UI/UX ENGINEER: Import/Export Screen
 * Main screen for importing and exporting trip data and full database backups
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card } from "@ui/components";
import { useExport } from "../hooks/use-export";
import { useImport } from "../hooks/use-import";

/**
 * ImportExportScreen
 *
 * Provides UI for:
 * - Exporting current trip (if viewing a trip)
 * - Exporting full database (backup)
 * - Importing from file (restore)
 * - Options: include sample data, include archived data
 *
 * @example
 * // Navigate to this screen:
 * router.push('/import-export')
 *
 * // Or with trip context:
 * router.push({ pathname: '/import-export', params: { tripId: '123' } })
 */
export default function ImportExportScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = params.tripId;

  // Hooks for export/import operations
  const { exportTrip, exportFullDatabase, isExporting } = useExport();
  const { importFromFile, isImporting } = useImport();

  // Options state
  const [includeSampleData, setIncludeSampleData] = useState(false);
  const [includeArchivedData, setIncludeArchivedData] = useState(false);

  // Set header title
  React.useEffect(() => {
    navigation.setOptions({
      title: "Import & Export",
    });
  }, [navigation]);

  const handleExportTrip = async () => {
    if (!tripId) return;

    await exportTrip(tripId, {
      includeSampleData,
      includeArchivedData,
    });
  };

  const handleExportFullDatabase = async () => {
    await exportFullDatabase({
      includeSampleData,
      includeArchivedData,
    });
  };

  const handleImportFromFile = async () => {
    await importFromFile("skip", {
      validateForeignKeys: true,
      dryRun: false,
    });
  };

  const isOperating = isExporting || isImporting;

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Export Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📤</Text>
            <Text style={styles.sectionTitle}>Export</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Export trip data or create a full backup of your database
          </Text>

          <Card style={styles.card}>
            {tripId && (
              <>
                <View style={styles.actionItem}>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Export Current Trip</Text>
                    <Text style={styles.actionDescription}>
                      Save this trip's data to share with others
                    </Text>
                  </View>
                  <Button
                    title={isExporting ? "Exporting..." : "Export Trip"}
                    onPress={handleExportTrip}
                    disabled={isOperating}
                    loading={isExporting}
                    variant="primary"
                    size="sm"
                    accessibilityLabel="Export current trip"
                    accessibilityHint="Exports the current trip data to a file"
                  />
                </View>
                <View style={styles.divider} />
              </>
            )}

            <View style={styles.actionItem}>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Export Full Database</Text>
                <Text style={styles.actionDescription}>
                  Complete backup of all trips and data
                </Text>
              </View>
              <Button
                title={isExporting ? "Exporting..." : "Export All"}
                onPress={handleExportFullDatabase}
                disabled={isOperating}
                loading={isExporting}
                variant="primary"
                size="sm"
                accessibilityLabel="Export full database"
                accessibilityHint="Creates a complete backup of all your data"
              />
            </View>
          </Card>

          {/* Export Options */}
          <Card style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>Export Options</Text>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Include Sample Data</Text>
                <Text style={styles.optionDescription}>
                  Export with sample/example data
                </Text>
              </View>
              <Switch
                value={includeSampleData}
                onValueChange={setIncludeSampleData}
                trackColor={{
                  false: theme.colors.disabled,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.text}
                disabled={isOperating}
                accessibilityLabel="Include sample data"
                accessibilityRole="switch"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Include Archived Data</Text>
                <Text style={styles.optionDescription}>
                  Include archived trips and expenses
                </Text>
              </View>
              <Switch
                value={includeArchivedData}
                onValueChange={setIncludeArchivedData}
                trackColor={{
                  false: theme.colors.disabled,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.text}
                disabled={isOperating}
                accessibilityLabel="Include archived data"
                accessibilityRole="switch"
              />
            </View>
          </Card>
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📥</Text>
            <Text style={styles.sectionTitle}>Import</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Import trip data or restore from a backup file
          </Text>

          <Card style={styles.card}>
            <View style={styles.actionItem}>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Import from File</Text>
                <Text style={styles.actionDescription}>
                  Restore data from a previously exported file
                </Text>
              </View>
              <Button
                title={isImporting ? "Importing..." : "Choose File"}
                onPress={handleImportFromFile}
                disabled={isOperating}
                loading={isImporting}
                variant="outline"
                size="sm"
                accessibilityLabel="Import from file"
                accessibilityHint="Opens file picker to select an import file"
              />
            </View>
          </Card>

          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningText}>
                  Importing will add new data to your database. Duplicate
                  entries will be skipped automatically. Always keep backups
                  before importing.
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Loading Overlay */}
        {isOperating && (
          <View style={styles.loadingOverlay}>
            <Card elevated style={styles.loadingCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {isExporting ? "Exporting data..." : "Importing data..."}
              </Text>
            </Card>
          </View>
        )}
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
    gap: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionIcon: {
    fontSize: theme.typography.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    gap: theme.spacing.md,
  },
  actionItem: {
    gap: theme.spacing.md,
  },
  actionInfo: {
    gap: theme.spacing.xs,
  },
  actionTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  actionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  optionsCard: {
    gap: theme.spacing.md,
  },
  optionsTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  optionInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  optionLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  optionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: theme.colors.warningBg,
    borderColor: theme.colors.warning,
    borderWidth: 1,
  },
  warningContent: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "flex-start",
  },
  warningIcon: {
    fontSize: theme.typography.xl,
  },
  warningTextContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  warningTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.warning,
  },
  warningText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingCard: {
    minWidth: 200,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: "center",
  },
});
