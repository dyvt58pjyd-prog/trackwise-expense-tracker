import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  ShoppingBag,
  HeartPulse,
  Film,
  Briefcase,
  Laptop,
  TrendingUp,
  Tag,
  Home,
  Plane,
  Book,
  Coffee,
  Smartphone,
  Gift,
  DollarSign,
  CreditCard,
  Smile,
  Shield,
  Percent,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  ShoppingBag,
  HeartPulse,
  Film,
  Briefcase,
  Laptop,
  TrendingUp,
  Tag,
  Home,
  Plane,
  Book,
  Coffee,
  Smartphone,
  Gift,
  DollarSign,
  CreditCard,
  Smile,
  Shield,
  Percent,
  Receipt,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface CategoryIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = 'w-5 h-5', color }) => {
  const IconComponent = ICON_MAP[iconName] || Tag;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
};
