/**
 * UTILITY: Category Icon Mapping
 * Centralized mapping of category names to vector icons
 */

import React from "react";
import {
  MaterialCommunityIcons,
  MaterialIcons,
  AntDesign,
  Entypo,
  Fontisto,
} from "@expo/vector-icons";

interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
}

/**
 * Get the appropriate icon component for a category name
 * This replaces the emoji-based system with vector icons
 */
export function getCategoryIcon({
  categoryName,
  size = 20,
  color = "#007AFF", // Default to iOS blue
}: CategoryIconProps) {
  switch (categoryName) {
    case "Travel & Transportation":
      return (
        <MaterialCommunityIcons name="airplane" size={size} color={color} />
      );
    case "Food & Drinks":
      return <MaterialCommunityIcons name="food" size={size} color={color} />;
    case "Leisure & Entertainment":
      return (
        <MaterialCommunityIcons name="drama-masks" size={size} color={color} />
      );
    case "Lodging":
      return <MaterialIcons name="hotel" size={size} color={color} />;
    case "Groceries":
      return (
        <MaterialIcons name="local-grocery-store" size={size} color={color} />
      );
    case "Insurance":
      return <AntDesign name="insurance" size={size} color={color} />;
    case "Shopping":
      return <Fontisto name="shopping-bag-1" size={size} color={color} />;
    case "Other":
    default:
      return <Entypo name="pin" size={size} color={color} />;
  }
}
