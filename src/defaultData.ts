import { Category, Product } from './types';

export const DEFAULT_CATEGORIES = (userId: string = 'guest'): Category[] => [
  {
    id: `cat_mercearia_${userId}`,
    name: 'Mercearia',
    iconName: 'Package',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_acougue_${userId}`,
    name: 'Açougue',
    iconName: 'Flame',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_hortifruti_${userId}`,
    name: 'Hortifruti',
    iconName: 'Leaf',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_laticinios_${userId}`,
    name: 'Laticínios & Ovos',
    iconName: 'Egg',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_padaria_${userId}`,
    name: 'Padaria',
    iconName: 'Croissant',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_bebidas_${userId}`,
    name: 'Bebidas',
    iconName: 'CupSoda',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_limpeza_${userId}`,
    name: 'Limpeza',
    iconName: 'Sparkles',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_higiene_${userId}`,
    name: 'Higiene & Beleza',
    iconName: 'Heart',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_outros_${userId}`,
    name: 'Outros',
    iconName: 'Layers',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  }
];

export const DEFAULT_PRODUCTS = (userId: string = 'guest'): Product[] => [
  {
    id: `prod_arroz_${userId}`,
    name: 'Arroz 5kg',
    categoryId: `cat_mercearia_${userId}`,
    unit: 'Pacote',
    brand: 'Tio João',
    lastPrice: 28.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_feijao_${userId}`,
    name: 'Feijão Carioca 1kg',
    categoryId: `cat_mercearia_${userId}`,
    unit: 'Pacote',
    brand: 'Kicaldo',
    lastPrice: 8.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_oleo_${userId}`,
    name: 'Óleo de Soja 900ml',
    categoryId: `cat_mercearia_${userId}`,
    unit: 'Un',
    brand: 'Liza',
    lastPrice: 6.20,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_leite_${userId}`,
    name: 'Leite Integral 1L',
    categoryId: `cat_laticinios_${userId}`,
    unit: 'Un',
    brand: 'Itambé',
    lastPrice: 5.49,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_pao_${userId}`,
    name: 'Pão de Forma',
    categoryId: `cat_padaria_${userId}`,
    unit: 'Pacote',
    brand: 'Wickbold',
    lastPrice: 9.80,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_cafe_${userId}`,
    name: 'Café Torrado e Moído 500g',
    categoryId: `cat_mercearia_${userId}`,
    unit: 'Pacote',
    brand: 'Pilão',
    lastPrice: 22.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_contra_file_${userId}`,
    name: 'Contra Filé',
    categoryId: `cat_acougue_${userId}`,
    unit: 'Kg',
    brand: 'Friboi',
    lastPrice: 48.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_frango_${userId}`,
    name: 'Peito de Frango Resfriado',
    categoryId: `cat_acougue_${userId}`,
    unit: 'Kg',
    brand: 'Seara',
    lastPrice: 19.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_banana_${userId}`,
    name: 'Banana Prata',
    categoryId: `cat_hortifruti_${userId}`,
    unit: 'Kg',
    brand: '',
    lastPrice: 6.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_sabonete_${userId}`,
    name: 'Sabonete 90g',
    categoryId: `cat_higiene_${userId}`,
    unit: 'Un',
    brand: 'Dove',
    lastPrice: 3.40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_detergente_${userId}`,
    name: 'Detergente Líquido 500ml',
    categoryId: `cat_limpeza_${userId}`,
    unit: 'Un',
    brand: 'Ypê',
    lastPrice: 2.35,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `prod_refrigerante_${userId}`,
    name: 'Refrigerante Cola 2L',
    categoryId: `cat_bebidas_${userId}`,
    unit: 'Un',
    brand: 'Coca-Cola',
    lastPrice: 9.99,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  }
];
