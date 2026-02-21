
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  SALESMAN = 'SALESMAN'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  assignedStoreId?: string; // Optional for Super Admin
  password?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface Product {
  id: string;
  sku: string;
  barcodeId?: string;
  name: string;
  category: string;
  quantity: number;
  buyingPrice: number;
  price: number;
  minThreshold: number;
  storeId: string;
  lastUpdated: string;
}

export interface Sale {
  id: string;
  invoiceId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  timestamp: string;
  storeId: string;
}

export interface Expense {
  id: string;
  storeId: string;
  category: string;
  amount: number;
  description: string;
  timestamp: string;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
  outOfStock: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
}
