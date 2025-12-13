/**
 * UI/UX ENGINEER: Currency Picker Component
 * Select currency from a list of common currencies
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { theme } from '@ui/theme';
import { COMMON_CURRENCIES, type Currency } from '@utils/currency-constants';
import { Card } from './Card';
import { Button } from './Button';

interface CurrencyPickerProps {
  value: string | null;
  onChange: (currency: string | null) => void;
  label?: string;
  placeholder?: string;
}

export function CurrencyPicker({
  value,
  onChange,
  label,
  placeholder = 'Select currency',
}: CurrencyPickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCurrency = COMMON_CURRENCIES.find((c) => c.code === value);
  const hasUnknownSelection = !!value && !selectedCurrency;

  const filteredCurrencies = searchQuery
    ? COMMON_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COMMON_CURRENCIES;

  const handleSelect = (currency: Currency) => {
    onChange(currency.code);
    setIsVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setIsVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Open currency selector"
        accessibilityHint="Opens a list of currencies"
        accessibilityState={{ expanded: isVisible }}
      >
        {selectedCurrency && (
          <View style={styles.selectedContent}>
            <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
            <View style={styles.currencyInfo}>
              <Text style={styles.currencyCode}>{selectedCurrency.code}</Text>
              <Text style={styles.currencyName}>{selectedCurrency.name}</Text>
            </View>
          </View>
        )}
        {hasUnknownSelection && (
          <View style={styles.selectedContent}>
            <Text style={styles.currencySymbol}>?</Text>
            <View style={styles.currencyInfo}>
              <Text style={styles.currencyCode}>{value}</Text>
              <Text style={styles.currencyName}>Unknown currency</Text>
            </View>
          </View>
        )}
        {!value && <Text style={styles.placeholder}>{placeholder}</Text>}
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close currency selector"
                accessibilityHint="Closes the currency list"
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />

            {value && (
              <Button
                title="Clear Selection"
                variant="outline"
                onPress={handleClear}
                accessibilityLabel="Clear currency selection"
                accessibilityHint="Clears the currently selected currency"
                fullWidth
              />
            )}

            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    item.code === value && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.name} (${item.code})`}
                  accessibilityHint="Sets this currency"
                >
                  <Text style={styles.itemSymbol}>{item.symbol}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemCode}>{item.code}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  {item.code === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    minHeight: 56,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  currencySymbol: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  currencyInfo: {
    gap: 2,
  },
  currencyCode: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  currencyName: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  placeholder: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
  },
  arrow: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  closeButton: {
    fontSize: theme.typography.xl,
    color: theme.colors.textMuted,
    padding: theme.spacing.xs,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  currencyItemSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  itemSymbol: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
    width: 40,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemCode: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  itemName: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    fontSize: theme.typography.lg,
    color: theme.colors.primary,
    fontWeight: theme.typography.bold,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
