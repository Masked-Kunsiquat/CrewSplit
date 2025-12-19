import React, { useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, CurrencyPicker } from "@ui/components";
import { theme } from "@ui/theme";
import { useUserSettings } from "@modules/onboarding/hooks/use-user-settings";

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export default function SetDefaultCurrencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const { updateSettings, loading } = useUserSettings();

  const handleNext = async () => {
    if (!selectedCurrency) {
      return;
    }
    try {
      await updateSettings({ defaultCurrency: selectedCurrency });
      router.push("/onboarding/username");
    } catch (error) {
      console.error("Failed to update default currency", error);
      Alert.alert(
        "Couldn't save currency",
        "Please try again. Your selection was not saved.",
      );
    }
  };

  const handleSkip = async () => {
    try {
      await updateSettings({ defaultCurrency: "USD" });
      router.push("/onboarding/username");
    } catch (error) {
      console.error("Failed to set default currency", error);
      Alert.alert(
        "Couldn't save currency",
        "Please try again. Your selection was not saved.",
      );
    }
  };

  const handleSelectPopular = (currency: string) => {
    setSelectedCurrency(currency);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: theme.spacing.lg + insets.top,
          paddingBottom: theme.spacing.lg + insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Set Your Default Currency</Text>
        <Text style={styles.description}>
          This will be the default for new trips. You can always change it
          later.
        </Text>
      </View>

      <View style={styles.popularContainer}>
        <Text style={styles.popularTitle}>Popular Currencies</Text>
        <View style={styles.popularGrid}>
          {POPULAR_CURRENCIES.map((currency) => (
            <Pressable
              key={currency}
              style={[
                styles.popularButton,
                selectedCurrency === currency && styles.selectedButton,
              ]}
              onPress={() => handleSelectPopular(currency)}
            >
              <Text
                style={[
                  styles.popularButtonText,
                  selectedCurrency === currency && styles.selectedButtonText,
                ]}
              >
                {currency}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <CurrencyPicker
        label="Currency"
        value={selectedCurrency}
        onChange={(currency) => setSelectedCurrency(currency)}
        placeholder="Select currency"
      />

      <View style={styles.footer}>
        <Button
          title={loading ? "Saving..." : "Next"}
          onPress={handleNext}
          disabled={!selectedCurrency || loading}
          fullWidth
        />
        <Button
          title="Skip"
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.h2,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  popularContainer: {
    gap: theme.spacing.md,
  },
  popularTitle: {
    fontSize: theme.typography.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  popularButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  popularButtonText: {
    fontSize: theme.typography.base,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  selectedButtonText: {
    color: theme.colors.background,
  },
  footer: {
    paddingBottom: 0,
    gap: theme.spacing.sm,
  },
});
