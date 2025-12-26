/**
 * UI/UX ENGINEER: FX Rate List Screen
 * View existing exchange rates with source, age, and refresh functionality
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card, LoadingScreen } from "@ui/components";
import { useFxRates, useAllFxRates } from "../hooks/use-fx-rates";
import { formatFxRate } from "@utils/formatting";

/**
 * Format timestamp as relative time (e.g., "2 days ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Get color based on staleness (days since fetch)
 */
function getStalenessColor(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffDays = (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return theme.colors.success;
  if (diffDays < 7) return theme.colors.textSecondary;
  return theme.colors.warning;
}

/**
 * Source display info
 */
function getSourceInfo(source: string): { label: string; icon: string } {
  switch (source) {
    case "manual":
      return { label: "Manual", icon: "✏️" };
    case "frankfurter":
      return { label: "Frankfurter API", icon: "🏦" };
    case "exchangerate-api":
      return { label: "ExchangeRate API", icon: "🌐" };
    default:
      return { label: source, icon: "❓" };
  }
}

export default function RateListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const {
    rateCount,
    isStale,
    oldestUpdate,
    refreshRates,
    refreshing,
    loading: initialLoading,
  } = useFxRates();

  const {
    rates,
    loading: loadingRates,
    refetch: refetchRates,
  } = useAllFxRates();

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: "Exchange Rates",
    });
  }, [navigation]);

  const handleRefresh = async () => {
    try {
      await refreshRates();
      await refetchRates();
      Alert.alert("Success", "Exchange rates updated successfully.");
    } catch (error) {
      Alert.alert(
        "Refresh Failed",
        error instanceof Error
          ? error.message
          : "Could not refresh rates. Check your internet connection.",
      );
    }
  };

  const handleAddManualRate = () => {
    router.push("/fx-rates/manual");
  };

  const loading = initialLoading || loadingRates;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={theme.commonStyles.container}>
      <FlatList
        data={rates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const sourceInfo = getSourceInfo(item.source);
          const ageColor = getStalenessColor(item.fetchedAt);
          const relativeTime = formatRelativeTime(item.fetchedAt);

          return (
            <Card style={styles.rateCard}>
              <View style={styles.rateHeader}>
                <View style={styles.currencyPair}>
                  <Text style={styles.currencyText}>{item.baseCurrency}</Text>
                  <Text style={styles.arrowText}>→</Text>
                  <Text style={styles.currencyText}>{item.quoteCurrency}</Text>
                </View>
                <Text style={styles.rateValue}>{formatFxRate(item.rate)}</Text>
              </View>

              <View style={styles.rateMetadata}>
                <View style={styles.metadataRow}>
                  <Text style={styles.sourceIcon}>{sourceInfo.icon}</Text>
                  <Text style={styles.metadataText}>{sourceInfo.label}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataText, { color: ageColor }]}>
                    {relativeTime}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            {isStale && (
              <Card style={styles.warningCard}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Rates are stale</Text>
                  <Text style={styles.warningText}>
                    Some exchange rates are over 24 hours old. Tap refresh to
                    update.
                  </Text>
                </View>
              </Card>
            )}

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total rates:</Text>
                <Text style={styles.summaryValue}>{rateCount}</Text>
              </View>
              {oldestUpdate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Oldest update:</Text>
                  <Text style={styles.summaryValue}>
                    {formatRelativeTime(oldestUpdate)}
                  </Text>
                </View>
              )}
            </Card>

            <View style={styles.actionRow}>
              <Button
                title={refreshing ? "Refreshing..." : "Refresh Rates"}
                onPress={handleRefresh}
                disabled={refreshing}
                loading={refreshing}
                fullWidth
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Exchange Rates</Text>
            <Text style={styles.emptyText}>
              No exchange rates are currently stored. Tap "Refresh Rates" to
              fetch from the internet, or add a manual rate.
            </Text>
            <Button
              title="Add Manual Rate"
              onPress={handleAddManualRate}
              variant="outline"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />

      {rates.length > 0 && (
        <View style={theme.commonStyles.footer}>
          <Button
            title="Add Manual Rate"
            onPress={handleAddManualRate}
            variant="outline"
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  warningCard: {
    backgroundColor: theme.colors.warningBg,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  warningIcon: {
    fontSize: theme.typography.xl,
  },
  warningContent: {
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
  summaryCard: {
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  actionRow: {
    gap: theme.spacing.md,
  },
  rateCard: {
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currencyPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  currencyText: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  arrowText: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
  },
  rateValue: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  rateMetadata: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sourceIcon: {
    fontSize: theme.typography.sm,
  },
  metadataText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
  },
});
