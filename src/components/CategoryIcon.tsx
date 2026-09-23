import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ name, className = '', size = 20 }: CategoryIconProps) {
  // Safe map to support icons elegantly
  const iconMap: Record<string, React.ComponentType<any>> = {
    Package: Icons.Package,
    Flame: Icons.Flame,
    Leaf: Icons.Leaf,
    Egg: Icons.Egg,
    Croissant: Icons.Croissant,
    CupSoda: Icons.CupSoda,
    Sparkles: Icons.Sparkles,
    Heart: Icons.Heart,
    Layers: Icons.Layers,
    Apple: Icons.Apple,
    Cake: Icons.Cake,
    Coins: Icons.Coins,
    Coffee: Icons.Coffee,
    Beef: Icons.Beef,
    GlassWater: Icons.GlassWater,
    ShoppingBag: Icons.ShoppingBag,
    Milk: Icons.Milk,
    Bath: Icons.Bath,
    Fish: Icons.Fish,
    Pizza: Icons.Pizza,
    Syringe: Icons.Syringe
  };

  const IconComponent = iconMap[name] || Icons.HelpCircle;

  return <IconComponent className={className} size={size} />;
}

export const AVAILABLE_ICONS = [
  { name: 'Package', label: 'Mercearia / Geral' },
  { name: 'Beef', label: 'Açougue / Carnes' },
  { name: 'Flame', label: 'Churrasco' },
  { name: 'Leaf', label: 'Frutas e Legumes' },
  { name: 'Apple', label: 'Hortifruti' },
  { name: 'Egg', label: 'Ovos / Laticínios' },
  { name: 'Milk', label: 'Laticínios' },
  { name: 'Croissant', label: 'Padaria' },
  { name: 'Cake', label: 'Confeitaria / Doces' },
  { name: 'CupSoda', label: 'Bebidas / Refrigerantes' },
  { name: 'GlassWater', label: 'Águas e Sucos' },
  { name: 'Sparkles', label: 'Produtos de Limpeza' },
  { name: 'Bath', label: 'Banho / Higiene' },
  { name: 'Heart', label: 'Higiene / Saúde' },
  { name: 'Syringe', label: 'Farmácia' },
  { name: 'ShoppingBag', label: 'Utilidades' },
  { name: 'Layers', label: 'Outros' }
];
