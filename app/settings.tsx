/**
 * UI/UX ENGINEER: Settings Screen
 * Global app settings including display currency preference
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { theme } from '@ui/theme';
import { Card, CurrencyPicker, Button, Input } from '@ui/components';
import { useDisplayCurrency } from '@hooks/use-display-currency';
import { useDeviceOwner } from '@hooks/use-device-owner';

export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { displayCurrency, loading, setDisplayCurrency } = useDisplayCurrency();
  const { deviceOwnerName, loading: ownerLoading, setDeviceOwner } = useDeviceOwner();

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: 'Settings',
    });
  }, [navigation]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleCurrencyChange = async (currency: string | null) => {
    try {
      await setDisplayCurrency(currency);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save display currency preference. Please try again.'
      );
    }
  };

  const handleEditName = () => {
    setNameInput(deviceOwnerName || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      await setDeviceOwner(nameInput.trim());
      setEditingName(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save your name. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput('');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Your Name</Text>
          <Text style={styles.sectionDescription}>
            This identifies you as the device owner. You'll be automatically added to new trips.
          </Text>

          {!ownerLoading && (
            <>
              {editingName ? (
                <>
                  <Input
                    label="Your name"
                    placeholder="Enter your name"
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
                </>
              ) : (
                <>
                  {deviceOwnerName ? (
                    <>
                      <Text style={styles.deviceOwnerName}>{deviceOwnerName}</Text>
                      <Button
                        title="Change Name"
                        variant="outline"
                        onPress={handleEditName}
                        fullWidth
                      />
                    </>
                  ) : (
                    <Button
                      title="Set Your Name"
                      onPress={handleEditName}
                      fullWidth
                    />
                  )}
                </>
              )}
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Display Currency</Text>
          <Text style={styles.sectionDescription}>
            Choose a currency to display amounts alongside the trip currency. This is for
            reference only and does not affect calculations.
          </Text>

          {!loading && (
            <CurrencyPicker
              value={displayCurrency}
              onChange={handleCurrencyChange}
              placeholder="None (use trip currency only)"
            />
          )}

          {displayCurrency && (
            <Card style={styles.infoCard}>
              <Text style={styles.infoText}>
                💡 Display currency conversions are shown in italics as a visual reference.
                All settlement calculations use the trip currency.
              </Text>
            </Card>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About CrewSplit</Text>
          <Text style={styles.aboutText}>
            A deterministic, family-focused trip expense-splitting app.
          </Text>
          <Text style={styles.aboutText}>
            All calculations are auditable and reproducible, with no hidden business logic.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Attribution</Text>
          <Text style={styles.aboutText}>
            CrewSplit is powered by open tools and data sources:
          </Text>
          {[
            {
              name: 'Drizzle ORM + SQLite',
              url: 'https://orm.drizzle.team',
              icon: require('../assets/attribution/drizzle-orm.svg'),
              description: 'Drizzle ORM + SQLite (offline-first)',
            },
            {
              name: 'Frankfurter API',
              url: 'https://www.frankfurter.app',
              icon: require('../assets/attribution/frankfurter-api.svg'),
              description: 'Frankfurter API (ECB reference rates)',
            },
            {
              name: 'ExchangeRate-API',
              url: 'https://www.exchangerate-api.com',
              icon: require('../assets/attribution/exchangerate-api.svg'),
              description: 'Exchange rates by ExchangeRate-API',
            },
            {
              name: 'Expo & React Native',
              url: 'https://expo.dev',
              icon: require('../assets/attribution/expo-go-app.svg'),
              description: 'Expo & React Native',
            },
          ].map((item) => (
            <View key={item.name} style={styles.attributionRow}>
              <Image
                source={item.icon}
                style={styles.attributionIcon}
                contentFit="contain"
                accessibilityLabel={`${item.name} logo`}
              />
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL(item.url)}
                accessible
                accessibilityRole="link"
                accessibilityLabel={item.name}
              >
                {item.description}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
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
    marginBottom: theme.spacing.sm,
  },
  section: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  deviceOwnerName: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
  },
  infoText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  aboutText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  linkText: {
    fontSize: theme.typography.base,
    color: theme.colors.primary,
    lineHeight: 22,
    textDecorationLine: 'underline',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  attributionIcon: {
    width: 24,
    height: 24,
  },
  versionText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
