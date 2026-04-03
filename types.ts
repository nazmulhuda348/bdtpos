export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  SALESMAN = 'SALESMAN' ,
  STORE_OWNER = 'STORE_OWNER'
}

export interface UserPermissions {
  inventory_edit: boolean;
  inventory_delete: boolean;
  sales_delete: boolean;
  purchase_delete: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  suppliers_edit: boolean;
  suppliers_delete: boolean;
  expenses_edit: boolean;
  expenses_delete: boolean;
  user_control_access: boolean;
  settings_access: boolean;
}

export interface User {
  id: string;
  name: string;
  phone?: string; 
  role: UserRole;
  avatar: string;
  assignedStoreId?: string; 
  password?: string;
  permissions?: UserPermissions;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  monthlyFee?: number; 
  billingStartMonth?: string;
}

export interface StorePayment {
  id: string;
  storeId: string;
  monthYear: string; 
  amountPaid: number;
  paymentDate: string;
  trxId?: string;
  status?: string;
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
  linkedExpenseId?: string;
}

export interface Sale {
  id: string;
  invoiceId: string;
  customerId?: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string; // 🔴 নতুন যুক্ত করা হলো
  timestamp: string;
  storeId: string;
}

export interface Expense {
  id: string;
  storeId: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod?: string; // 🔴 নতুন যুক্ত করা হলো
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDue: number;
  storeId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDue: number;
  storeId: string;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  amountPaid: number;
  amountDue: number;
  timestamp: string;
  storeId: string;
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

// 🔴 পেমেন্ট ট্রানজেকশনের ধরনগুলো আপডেট করা হলো 🔴
export type TransactionType = 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL' | 'CASH_OUT' | 'TRANSFER';
export type PaymentSource = 'CASH' | 'BANK' | 'CARD' | 'BKASH' | 'NAGAD';

export interface CashTransaction {
  id: string;
  storeId: string;
  type: TransactionType;
  source: PaymentSource | string;
  destination?: PaymentSource | string; // 🔴 নতুন ট্রান্সফারের জন্য
  amount: number;
  description: string;
  timestamp: string;
}