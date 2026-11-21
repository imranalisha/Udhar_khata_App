export type TransactionType = 'cash_sale' | 'udhar_given' | 'udhar_received';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  note: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  note: string;
  customerId?: string;
  /** Local calendar date YYYY-MM-DD for effortless daily register grouping */
  date: string;
  /** ISO timestamp for exact chronological ordering and time display */
  createdAt: string;
}

export type LabelMode = 'bilingual' | 'english';

export interface ShopSettings {
  shopName: string;
  currency: string;
  labelMode: LabelMode;
  quickItems: string[];
}

export interface LedgerStore {
  version: number;
  isSampleData: boolean;
  settings: ShopSettings;
  customers: Customer[];
  transactions: Transaction[];
}

export type ActiveTab = 'today' | 'khata' | 'summary';
