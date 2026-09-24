export interface Category {
  id: string;
  name: string;
  iconName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  brand: string;
  barcode?: string;
  lastPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  productBrand: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  isChecked: boolean; // Add to Cart status inside this specific purchase session
  barcode?: string;
}

export type PurchaseType = 'monthly' | 'weekly' | 'emergency' | 'butcher' | 'pharmacy' | 'other';

export const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  emergency: 'Emergencial',
  butcher: 'Açougue',
  pharmacy: 'Farmácia',
  other: 'Outros'
};

export type PurchaseStatus = 'inProgress' | 'completed';

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  inProgress: 'Em andamento',
  completed: 'Finalizada'
};

export interface Purchase {
  id: string;
  name: string;
  market: string;
  date: string; // ISO date-time
  type: PurchaseType;
  notes?: string;
  status: PurchaseStatus;
  total: number;
  budget?: number; // RN-COM-009: Planned spending budget limit
  discount?: number; // RN-COM-010: Store coupon or discount
  additionalFee?: number; // RN-COM-010: Bag/delivery fees
  itemsCount?: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  color?: string;
  passwordHash?: string;
  productsSeeded?: boolean;
  categoriesSeeded?: boolean;
  createdAt: string;
  updatedAt: string;
}
