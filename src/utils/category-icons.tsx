/**
 * UTILITY: Category Icon Mapping
 * Centralized mapping of category names to vector icons and colors
 */

import React from "react";
import {
  MaterialCommunityIcons,
  MaterialIcons,
  AntDesign,
  Entypo,
  Fontisto,
} from "@expo/vector-icons";
import { theme } from "@ui/theme";

interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
}

/**
 * Map a category name to a consistent chart color.
 *
 * @param categoryName - Category name to map to a chart color
 * @returns A color string from the theme's chart colors associated with `categoryName`; if the category is unknown, returns the last chart color as a fallback
 */
export function getCategoryColor(categoryName: string): string {
  const categories = [
    "Travel & Transportation",
    "Food & Drinks",
    "Leisure & Entertainment",
    "Lodging",
    "Groceries",
    "Insurance",
    "Shopping",
    "Other",
  ];

  const index = categories.indexOf(categoryName);
  if (index === -1) {
    // Unknown category, use last color
    return theme.colors.chartColors[
      (categories.length - 1) % theme.colors.chartColors.length
    ];
  }

  return theme.colors.chartColors[index % theme.colors.chartColors.length];
}

/**
 * Return a JSX icon element that represents the provided category.
 *
 * If `color` is omitted, the icon color is derived from the category's chart color.
 *
 * @param categoryName - The name of the category to map to an icon
 * @param size - Icon size in pixels (default: 20)
 * @param color - Optional color override for the icon
 * @returns A JSX.Element representing the icon for the category
 */
export function getCategoryIcon({
  categoryName,
  size = 20,
  color,
}: CategoryIconProps) {
  const iconColor = color ?? getCategoryColor(categoryName);
  switch (categoryName) {
    case "Travel & Transportation":
      return (
        <MaterialCommunityIcons name="airplane" size={size} color={iconColor} />
      );
    case "Food & Drinks":
      return (
        <MaterialCommunityIcons name="food" size={size} color={iconColor} />
      );
    case "Leisure & Entertainment":
      return (
        <MaterialCommunityIcons
          name="drama-masks"
          size={size}
          color={iconColor}
        />
      );
    case "Lodging":
      return <MaterialIcons name="hotel" size={size} color={iconColor} />;
    case "Groceries":
      return (
        <MaterialIcons
          name="local-grocery-store"
          size={size}
          color={iconColor}
        />
      );
    case "Insurance":
      return <AntDesign name="insurance" size={size} color={iconColor} />;
    case "Shopping":
      return <Fontisto name="shopping-bag-1" size={size} color={iconColor} />;
    case "Other":
    default:
      return <Entypo name="pin" size={size} color={iconColor} />;
  }
}
