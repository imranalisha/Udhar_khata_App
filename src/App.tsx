import React, {useCallback, useEffect, useState} from 'react';
import {BarChart3, BookOpen, Plus, ReceiptText, RotateCcw} from 'lucide-react';
import {BottomSheet} from './components/BottomSheet';
import {KhataView} from './components/KhataView';
import {OfflineIndicator} from './components/OfflineIndicator';
import {QuickEntryForm} from './components/QuickEntryForm';
import {SummaryView} from './components/SummaryView';
import {TodayView} from './components/TodayView';
import {
  ActiveTab,
  Customer,
  LedgerStore,
  ShopSettings,
  Transaction,
  TransactionType,
} from './types/ledger';
import {getLabels} from './utils/labels';
import {
  createEmptyStore,
  createId,
  formatMoney,
  getLocalDateString,
  loadStore,
  saveStore,
} from './utils/storage';

interface EntryModalState {
  open: boolean;
  initialType: TransactionType;
  lockedCustomerId?: string;
  editingTransaction?: Transaction | null;
}

export default function App() {
  const [store, setStore] = useState<LedgerStore>(() => loadStore());
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [entryModal, setEntryModal] = useState<EntryModalState>({
    open: false,
    initialType: 'cash_sale',
    lockedCustomerId: undefined,
    editingTransaction: null,
  });

  // Persist every state change immediately to offline localStorage
  useEffect(() => {
    saveStore(store);
  }, [store]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const labels = getLabels(store.settings.labelMode);

  const handleSaveEntry = useCallback(
    (payload: {
      id?: string;
      type: TransactionType;
      amount: number;
      note: string;
      date: string;
      customerId?: string;
      newCustomerName?: string;
      newCustomerPhone?: string;
    }) => {
      setStore((prev) => {
        let nextCustomers = prev.customers;
        let resolvedCustomerId = payload.customerId;

        if (
          (payload.type === 'udhar_given' || payload.type === 'udhar_received') &&
          payload.newCustomerName
        ) {
          const newCust: Customer = {
            id: createId('cust'),
            name: payload.newCustomerName,
            phone: payload.newCustomerPhone ?? '',
            note: '',
            createdAt: new Date().toISOString(),
          };
          nextCustomers = [newCust, ...prev.customers];
          resolvedCustomerId = newCust.id;
        }

        if (payload.id) {
          const nextTransactions = prev.transactions.map((tx) =>
            tx.id === payload.id
              ? {
                  ...tx,
                  type: payload.type,
                  amount: payload.amount,
                  note: payload.note,
                  date: payload.date,
                  customerId:
                    payload.type === 'cash_sale' ? undefined : resolvedCustomerId,
                }
              : tx
          );
          return {
            ...prev,
            customers: nextCustomers,
            transactions: nextTransactions,
          };
        }

        const newTx: Transaction = {
          id: createId('tx'),
          type: payload.type,
          amount: payload.amount,
          note: payload.note,
          date: payload.date,
          customerId: payload.type === 'cash_sale' ? undefined : resolvedCustomerId,
          createdAt: new Date().toISOString(),
        };

        return {
          ...prev,
          customers: nextCustomers,
          transactions: [newTx, ...prev.transactions],
        };
      });

      setSelectedDate(payload.date);
      setEntryModal((prev) => ({...prev, open: false, editingTransaction: null}));
      showToast(payload.id ? 'Entry updated.' : 'Entry saved offline.');
    },
    [showToast]
  );

  const handleDeleteTransaction = useCallback(
    (transactionId: string) => {
      setStore((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((tx) => tx.id !== transactionId),
      }));
      setEntryModal((prev) => ({...prev, open: false, editingTransaction: null}));
      showToast('Entry deleted.');
    },
    [showToast]
  );

  const handleAddCustomer = useCallback(
    (data: {name: string; phone: string; note: string}) => {
      const newCust: Customer = {
        id: createId('cust'),
        name: data.name,
        phone: data.phone,
        note: data.note,
        createdAt: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        customers: [newCust, ...prev.customers],
      }));
      setSelectedCustomerId(newCust.id);
      showToast(`${data.name} added to khata.`);
    },
    [showToast]
  );

  const handleUpdateCustomer = useCallback(
    (id: string, data: {name: string; phone: string; note: string}) => {
      setStore((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? {...c, name: data.name, phone: data.phone, note: data.note} : c
        ),
      }));
      showToast('Customer updated.');
    },
    [showToast]
  );

  const handleDeleteCustomer = useCallback(
    (id: string) => {
      setStore((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== id),
        transactions: prev.transactions.filter((tx) => tx.customerId !== id),
      }));
      setSelectedCustomerId(null);
      showToast('Customer removed.');
    },
    [showToast]
  );

  const handleUpdateSettings = useCallback((nextSettings: ShopSettings) => {
    setStore((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
  }, []);

  const handleRestoreBackup = useCallback((restored: LedgerStore) => {
    setStore(restored);
    setSelectedCustomerId(null);
  }, []);

  const handleClearAllData = useCallback(() => {
    setStore((prev) => createEmptyStore(prev.settings));
    setSelectedCustomerId(null);
    showToast('Started fresh with an empty ledger.');
  }, [showToast]);

  const handleShareReminder = useCallback(
    async (customer: Customer, balance: number) => {
      const formatted = formatMoney(Math.abs(balance), store.settings.currency);
      const statusText =
        balance > 0
          ? `current udhar balance is ${formatted}`
          : balance < 0
            ? `advance credit balance is ${formatted}`
            : `khata balance is cleared (${formatted})`;
      const message = `Assalam-o-Alaikum ${customer.name}, your ${statusText} at ${store.settings.shopName}. Thank you!`;

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${store.settings.shopName} — Khata Balance`,
            text: message,
          });
          return;
        } catch {
          // User dismissed share sheet or share unavailable; fall back to clipboard
        }
      }

      try {
        await navigator.clipboard.writeText(message);
        showToast('Balance reminder copied — ready to paste in WhatsApp or SMS.');
      } catch {
        showToast(message);
      }
    },
    [store.settings.currency, store.settings.shopName, showToast]
  );

  const handleJumpToCustomer = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('khata');
  }, []);

  const navItems: {id: ActiveTab; label: string; icon: React.FC<{className?: string}>}[] = [
    {id: 'today', label: labels.todayTab, icon: ReceiptText},
    {id: 'khata', label: labels.khataTab, icon: BookOpen},
    {id: 'summary', label: labels.summaryTab, icon: BarChart3},
  ];

  const modalTitle = entryModal.editingTransaction
    ? 'Edit Entry'
    : entryModal.initialType === 'udhar_given'
      ? labels.udharGiven
      : entryModal.initialType === 'udhar_received'
        ? labels.udharReceived
        : labels.cashSale;

  return (
    <div className="min-h-dvh bg-[#F7F8FA] text-slate-900">
      {/* Desktop Top Bar (Strict 3-Zone Contract: Wordmark — Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 hidden border-b border-slate-200/90 bg-white/95 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-display text-lg font-extrabold tracking-tight text-teal-800 whitespace-nowrap shrink-0"
          >
            Sada Khata
          </button>

          <nav aria-label="Primary navigation" className="flex items-center gap-7">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-slate-950 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-teal-700"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                setEntryModal({
                  open: true,
                  initialType: 'cash_sale',
                  lockedCustomerId: undefined,
                  editingTransaction: null,
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Top Bar (48px height to keep Top + Bottom sticky bars strictly under 15% cap) */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <span className="font-display text-base font-extrabold tracking-tight text-teal-800 whitespace-nowrap shrink-0">
          Sada Khata
        </span>
        <button
          type="button"
          onClick={() =>
            setEntryModal({
              open: true,
              initialType: activeTab === 'khata' ? 'udhar_given' : 'cash_sale',
              lockedCustomerId:
                activeTab === 'khata' && selectedCustomerId ? selectedCustomerId : undefined,
              editingTransaction: null,
            })
          }
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          New Entry
        </button>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
        {/* Quiet inline sample-data bar (never a blocking popup) */}
        {store.isSampleData && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
            <span>Showing sample shop entries so you can explore Sada Khata right away.</span>
            <button
              type="button"
              onClick={handleClearAllData}
              className="inline-flex items-center gap-1.5 font-semibold text-teal-800 hover:underline whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start Fresh (Clear Sample)
            </button>
          </div>
        )}

        {activeTab === 'today' && (
          <TodayView
            settings={store.settings}
            customers={store.customers}
            transactions={store.transactions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenNewEntryModal={(defaultType) =>
              setEntryModal({
                open: true,
                initialType: defaultType,
                lockedCustomerId: undefined,
                editingTransaction: null,
              })
            }
            onEditTransaction={(tx) =>
              setEntryModal({
                open: true,
                initialType: tx.type,
                lockedCustomerId: undefined,
                editingTransaction: tx,
              })
            }
            onQuickSave={handleSaveEntry}
            onJumpToCustomer={handleJumpToCustomer}
          />
        )}

        {activeTab === 'khata' && (
          <KhataView
            settings={store.settings}
            customers={store.customers}
            transactions={store.transactions}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenCustomerEntry={(customerId, type) =>
              setEntryModal({
                open: true,
                initialType: type,
                lockedCustomerId: customerId,
                editingTransaction: null,
              })
            }
            onEditTransaction={(tx) =>
              setEntryModal({
                open: true,
                initialType: tx.type,
                lockedCustomerId: tx.customerId,
                editingTransaction: tx,
              })
            }
            onShareReminder={handleShareReminder}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryView
            store={store}
            onUpdateSettings={handleUpdateSettings}
            onRestoreBackup={handleRestoreBackup}
            onClearAllData={handleClearAllData}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (56px height; 48px top + 56px bottom = 104px, <= 15% cap) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="grid h-14 grid-cols-3 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Entry Add / Edit Bottom Sheet */}
      <BottomSheet
        open={entryModal.open}
        title={modalTitle}
        onClose={() => setEntryModal((prev) => ({...prev, open: false, editingTransaction: null}))}
      >
        <QuickEntryForm
          key={`${entryModal.editingTransaction?.id ?? 'new'}-${entryModal.initialType}-${entryModal.lockedCustomerId ?? 'any'}`}
          settings={store.settings}
          customers={store.customers}
          transactions={store.transactions}
          initialDate={selectedDate}
          initialType={entryModal.initialType}
          lockedCustomerId={entryModal.lockedCustomerId}
          editingTransaction={entryModal.editingTransaction}
          onSave={handleSaveEntry}
          onDelete={handleDeleteTransaction}
          onCancel={() =>
            setEntryModal((prev) => ({...prev, open: false, editingTransaction: null}))
          }
        />
      </BottomSheet>

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
        >
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-center text-xs font-medium text-white shadow-lg lg:text-left">
            {toast}
          </div>
        </div>
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
