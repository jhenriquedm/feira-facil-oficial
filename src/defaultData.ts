import { Category, Product } from './types';

export const DEFAULT_CATEGORIES = (userId: string = 'guest'): Category[] => [
  {
    id: 'cat_mercearia',
    name: 'Mercearia',
    iconName: 'Package',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_acougue',
    name: 'Açougue',
    iconName: 'Flame',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_hortifruti',
    name: 'Hortifruti',
    iconName: 'Leaf',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_laticinios',
    name: 'Laticínios & Ovos',
    iconName: 'Egg',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_padaria',
    name: 'Padaria',
    iconName: 'Croissant',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_bebidas',
    name: 'Bebidas',
    iconName: 'CupSoda',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_limpeza',
    name: 'Limpeza',
    iconName: 'Sparkles',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_higiene',
    name: 'Higiene & Beleza',
    iconName: 'Heart',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'cat_outros',
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
    id: 'prod_arroz',
    name: 'Arroz 5kg',
    categoryId: 'cat_mercearia',
    unit: 'Pacote',
    brand: 'Tio João',
    lastPrice: 28.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_feijao',
    name: 'Feijão Carioca 1kg',
    categoryId: 'cat_mercearia',
    unit: 'Pacote',
    brand: 'Kicaldo',
    lastPrice: 8.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_oleo',
    name: 'Óleo de Soja 900ml',
    categoryId: 'cat_mercearia',
    unit: 'Un',
    brand: 'Liza',
    lastPrice: 6.20,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_leite',
    name: 'Leite Integral 1L',
    categoryId: 'cat_laticinios',
    unit: 'Un',
    brand: 'Itambé',
    lastPrice: 5.49,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_pao',
    name: 'Pão de Forma',
    categoryId: 'cat_padaria',
    unit: 'Pacote',
    brand: 'Wickbold',
    lastPrice: 9.80,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_cafe',
    name: 'Café Torrado e Moído 500g',
    categoryId: 'cat_mercearia',
    unit: 'Pacote',
    brand: 'Pilão',
    lastPrice: 22.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_contra_file',
    name: 'Contra Filé',
    categoryId: 'cat_acougue',
    unit: 'Kg',
    brand: 'Friboi',
    lastPrice: 48.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_frango',
    name: 'Peito de Frango Resfriado',
    categoryId: 'cat_acougue',
    unit: 'Kg',
    brand: 'Seara',
    lastPrice: 19.90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_banana',
    name: 'Banana Prata',
    categoryId: 'cat_hortifruti',
    unit: 'Kg',
    brand: '',
    lastPrice: 6.50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_sabonete',
    name: 'Sabonete 90g',
    categoryId: 'cat_higiene',
    unit: 'Un',
    brand: 'Dove',
    lastPrice: 3.40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_detergente',
    name: 'Detergente Líquido 500ml',
    categoryId: 'cat_limpeza',
    unit: 'Un',
    brand: 'Ypê',
    lastPrice: 2.35,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: 'prod_refrigerante',
    name: 'Refrigerante Cola 2L',
    categoryId: 'cat_bebidas',
    unit: 'Un',
    brand: 'Coca-Cola',
    lastPrice: 9.99,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  }
];
