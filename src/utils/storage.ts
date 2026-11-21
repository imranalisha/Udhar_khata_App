import {Customer, LedgerStore, ShopSettings, Transaction} from '../types/ledger';

const STORAGE_KEY = 'sada_khata_ledger_v1';

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'My Shop',
  currency: 'Rs.',
  labelMode: 'bilingual',
  quickItems: [
    'Sugar / Cheeni',
    'Flour / Atta',
    'Cooking Oil',
    'Tea / Chai',
    'Milk / Doodh',
    'Bread / Eggs',
    'Rice / Chawal',
    'Cold Drink',
  ],
};

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Local YYYY-MM-DD string (avoids UTC midnight date-shift bugs for shopkeepers) */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateString(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offsetDays);
  return getLocalDateString(dt);
}

export function formatReadableDate(dateStr: string): string {
  const today = getLocalDateString();
  const yesterday = shiftDateString(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTimeShort(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMoney(amount: number, currency: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  const prefix = safe < 0 ? '-' : '';
  return `${prefix}${currency} ${formatted}`;
}

export function getCustomerBalance(customerId: string, transactions: Transaction[]): number {
  let balance = 0;
  for (const tx of transactions) {
    if (tx.customerId !== customerId) continue;
    if (tx.type === 'udhar_given') balance += tx.amount;
    else if (tx.type === 'udhar_received') balance -= tx.amount;
  }
  return Math.round(balance * 100) / 100;
}

export function getCustomerLastActivity(customerId: string, transactions: Transaction[]): string | null {
  let latest: string | null = null;
  for (const tx of transactions) {
    if (tx.customerId !== customerId) continue;
    if (!latest || tx.createdAt > latest) {
      latest = tx.createdAt;
    }
  }
  return latest;
}

function buildSampleStore(): LedgerStore {
  const today = getLocalDateString();
  const yesterday = shiftDateString(today, -1);
  const twoDaysAgo = shiftDateString(today, -2);
  const threeDaysAgo = shiftDateString(today, -3);

  const makeIso = (dateStr: string, hour: number, minute: number) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, hour, minute, 0).toISOString();
  };

  const customers: Customer[] = [
    {
      id: 'cust_tariq',
      name: 'Tariq Mahmood',
      phone: '0300-4128901',
      note: 'Street 4, House 12',
      createdAt: makeIso(threeDaysAgo, 9, 15),
    },
    {
      id: 'cust_saima',
      name: 'Saima Bibi',
      phone: '0321-8845120',
      note: 'Pays on 1st of month',
      createdAt: makeIso(threeDaysAgo, 11, 20),
    },
    {
      id: 'cust_bilal',
      name: 'Bilal Ahmed',
      phone: '0333-5190442',
      note: 'Nearby workshop',
      createdAt: makeIso(twoDaysAgo, 14, 10),
    },
    {
      id: 'cust_kamran',
      name: 'Kamran Tea Stall',
      phone: '0345-6612098',
      note: 'Daily milk & sugar',
      createdAt: makeIso(twoDaysAgo, 8, 5),
    },
  ];

  const transactions: Transaction[] = [
    // Today
    {
      id: 'tx_1',
      type: 'cash_sale',
      amount: 450,
      note: 'Sugar 2kg, Tea pack',
      date: today,
      createdAt: makeIso(today, 9, 12),
    },
    {
      id: 'tx_2',
      type: 'udhar_given',
      amount: 1850,
      note: 'Flour 10kg, Cooking oil 1L',
      customerId: 'cust_tariq',
      date: today,
      createdAt: makeIso(today, 10, 5),
    },
    {
      id: 'tx_3',
      type: 'cash_sale',
      amount: 280,
      note: 'Bread, 6 Eggs, Milk',
      date: today,
      createdAt: makeIso(today, 10, 42),
    },
    {
      id: 'tx_4',
      type: 'udhar_received',
      amount: 1000,
      note: 'Part payment cash',
      customerId: 'cust_kamran',
      date: today,
      createdAt: makeIso(today, 11, 18),
    },
    {
      id: 'tx_5',
      type: 'cash_sale',
      amount: 620,
      note: 'Rice 2kg, Pulses',
      date: today,
      createdAt: makeIso(today, 12, 30),
    },
    {
      id: 'tx_6',
      type: 'udhar_given',
      amount: 740,
      note: 'Milk 4L, Sugar 1kg',
      customerId: 'cust_kamran',
      date: today,
      createdAt: makeIso(today, 13, 15),
    },
    // Yesterday
    {
      id: 'tx_7',
      type: 'cash_sale',
      amount: 2150,
      note: 'Morning groceries & cold drinks',
      date: yesterday,
      createdAt: makeIso(yesterday, 11, 20),
    },
    {
      id: 'tx_8',
      type: 'udhar_given',
      amount: 2400,
      note: 'Monthly kitchen groceries',
      customerId: 'cust_saima',
      date: yesterday,
      createdAt: makeIso(yesterday, 15, 45),
    },
    {
      id: 'tx_9',
      type: 'udhar_given',
      amount: 1200,
      note: 'Milk & sugar supply',
      customerId: 'cust_kamran',
      date: yesterday,
      createdAt: makeIso(yesterday, 18, 10),
    },
    // 2 days ago
    {
      id: 'tx_10',
      type: 'cash_sale',
      amount: 1890,
      note: 'Counter sales',
      date: twoDaysAgo,
      createdAt: makeIso(twoDaysAgo, 17, 30),
    },
    {
      id: 'tx_11',
      type: 'udhar_given',
      amount: 950,
      note: 'Tea, biscuits, cold drinks',
      customerId: 'cust_bilal',
      date: twoDaysAgo,
      createdAt: makeIso(twoDaysAgo, 14, 15),
    },
    {
      id: 'tx_12',
      type: 'udhar_received',
      amount: 950,
      note: 'Full settlement',
      customerId: 'cust_bilal',
      date: yesterday,
      createdAt: makeIso(yesterday, 19, 0),
    },
    // 3 days ago
    {
      id: 'tx_13',
      type: 'cash_sale',
      amount: 1640,
      note: 'Daily counter sales',
      date: threeDaysAgo,
      createdAt: makeIso(threeDaysAgo, 16, 40),
    },
    {
      id: 'tx_14',
      type: 'udhar_given',
      amount: 650,
      note: 'Cooking oil & spices',
      customerId: 'cust_tariq',
      date: threeDaysAgo,
      createdAt: makeIso(threeDaysAgo, 10, 0),
    },
  ];

  return {
    version: 1,
    isSampleData: true,
    settings: {
      ...DEFAULT_SETTINGS,
      shopName: 'Barkat General Store',
    },
    customers,
    transactions,
  };
}

export function createEmptyStore(preserveSettings?: ShopSettings): LedgerStore {
  return {
    version: 1,
    isSampleData: false,
    settings: preserveSettings ?? {...DEFAULT_SETTINGS},
    customers: [],
    transactions: [],
  };
}

export function loadStore(): LedgerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const sample = buildSampleStore();
      saveStore(sample);
      return sample;
    }
    const parsed = JSON.parse(raw) as Partial<LedgerStore>;
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.customers)) {
      const sample = buildSampleStore();
      saveStore(sample);
      return sample;
    }
    return {
      version: 1,
      isSampleData: Boolean(parsed.isSampleData),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        quickItems:
          Array.isArray(parsed.settings?.quickItems) && parsed.settings.quickItems.length > 0
            ? parsed.settings.quickItems
            : DEFAULT_SETTINGS.quickItems,
      },
      customers: parsed.customers,
      transactions: parsed.transactions,
    };
  } catch {
    return buildSampleStore();
  }
}

export function saveStore(store: LedgerStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage quota exceeded or restricted mode; keep in-memory state active
  }
}

export function parseBackupJson(rawText: string): LedgerStore | null {
  try {
    const parsed = JSON.parse(rawText) as Partial<LedgerStore>;
    if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.transactions)) {
      return null;
    }

    const validCustomers: Customer[] = parsed.customers
      .filter((c): c is Customer => Boolean(c && typeof c.id === 'string' && typeof c.name === 'string'))
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        phone: typeof c.phone === 'string' ? c.phone : '',
        note: typeof c.note === 'string' ? c.note : '',
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      }));

    const validTypes = new Set(['cash_sale', 'udhar_given', 'udhar_received']);
    const validTransactions: Transaction[] = parsed.transactions
      .filter(
        (t): t is Transaction =>
          Boolean(
            t &&
              typeof t.id === 'string' &&
              validTypes.has(t.type) &&
              typeof t.amount === 'number' &&
              Number.isFinite(t.amount) &&
              t.amount > 0 &&
              typeof t.date === 'string'
          )
      )
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: Math.round(t.amount * 100) / 100,
        note: typeof t.note === 'string' ? t.note : '',
        customerId: typeof t.customerId === 'string' ? t.customerId : undefined,
        date: t.date,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
      }));

    return {
      version: 1,
      isSampleData: false,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      },
      customers: validCustomers,
      transactions: validTransactions,
    };
  } catch {
    return null;
  }
}

export function buildCsvExport(store: LedgerStore): string {
  const customerMap = new Map(store.customers.map((c) => [c.id, c.name]));
  const escapeCsv = (val: string) => {
    const safe = val.replace(/"/g, '""');
    return /[",\n]/.test(safe) ? `"${safe}"` : safe;
  };

  const rows = [
    ['Date', 'Time', 'Type', 'Customer', 'Item / Note', `Amount (${store.settings.currency})`],
    ...store.transactions
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((tx) => [
        tx.date,
        formatTimeShort(tx.createdAt),
        tx.type === 'cash_sale'
          ? 'Cash Sale'
          : tx.type === 'udhar_given'
            ? 'Udhar Given'
            : 'Payment Received',
        tx.customerId ? (customerMap.get(tx.customerId) ?? '') : '',
        tx.note,
        String(tx.amount),
      ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
