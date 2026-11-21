import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  Phone,
  Search,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {Customer, ShopSettings, Transaction, TransactionType} from '../types/ledger';
import {getLabels} from '../utils/labels';
import {
  formatMoney,
  formatReadableDate,
  formatTimeShort,
  getCustomerBalance,
  getCustomerLastActivity,
} from '../utils/storage';
import {BottomSheet} from './BottomSheet';

interface KhataViewProps {
  settings: ShopSettings;
  customers: Customer[];
  transactions: Transaction[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  onAddCustomer: (data: {name: string; phone: string; note: string}) => void;
  onUpdateCustomer: (id: string, data: {name: string; phone: string; note: string}) => void;
  onDeleteCustomer: (id: string) => void;
  onOpenCustomerEntry: (customerId: string, type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onShareReminder: (customer: Customer, balance: number) => void;
}

type SortBy = 'balance' | 'recent' | 'name';

export const KhataView: React.FC<KhataViewProps> = ({
  settings,
  customers,
  transactions,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onOpenCustomerEntry,
  onEditTransaction,
  onShareReminder,
}) => {
  const labels = getLabels(settings.labelMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('balance');
  const [onlyWithDue, setOnlyWithDue] = useState(false);

  // Add / Edit Customer modal state
  const [customerModalMode, setCustomerModalMode] = useState<'add' | 'edit' | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);

  const enrichedCustomers = useMemo(() => {
    return customers.map((customer) => ({
      customer,
      balance: getCustomerBalance(customer.id, transactions),
      lastActivity: getCustomerLastActivity(customer.id, transactions),
    }));
  }, [customers, transactions]);

  const totalReceivable = useMemo(() => {
    return enrichedCustomers.reduce((sum, item) => sum + (item.balance > 0 ? item.balance : 0), 0);
  }, [enrichedCustomers]);

  const openBalanceCount = useMemo(() => {
    return enrichedCustomers.filter((item) => item.balance > 0).length;
  }, [enrichedCustomers]);

  const visibleCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedCustomers
      .filter((item) => {
        if (onlyWithDue && item.balance <= 0) return false;
        if (!q) return true;
        return (
          item.customer.name.toLowerCase().includes(q) ||
          item.customer.phone.toLowerCase().includes(q) ||
          item.customer.note.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'balance') {
          if (b.balance !== a.balance) return b.balance - a.balance;
          return a.customer.name.localeCompare(b.customer.name);
        }
        if (sortBy === 'recent') {
          const la = a.lastActivity ?? a.customer.createdAt;
          const lb = b.lastActivity ?? b.customer.createdAt;
          return lb.localeCompare(la);
        }
        return a.customer.name.localeCompare(b.customer.name);
      });
  }, [enrichedCustomers, searchQuery, sortBy, onlyWithDue]);

  // On desktop, auto-pick first visible customer if none selected
  const activeCustomerRecord = useMemo(() => {
    if (selectedCustomerId) {
      return enrichedCustomers.find((c) => c.customer.id === selectedCustomerId) ?? null;
    }
    return null;
  }, [selectedCustomerId, enrichedCustomers]);

  // Compute running balance chronologically for selected customer
  const customerLedgerRows = useMemo(() => {
    if (!activeCustomerRecord) return [];
    const chronological = transactions
      .filter((tx) => tx.customerId === activeCustomerRecord.customer.id)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    let running = 0;
    const withRunning = chronological.map((tx) => {
      if (tx.type === 'udhar_given') running += tx.amount;
      else if (tx.type === 'udhar_received') running -= tx.amount;
      running = Math.round(running * 100) / 100;
      return {tx, runningBalance: running};
    });

    return withRunning.reverse();
  }, [activeCustomerRecord, transactions]);

  const openAddModal = () => {
    setFormName('');
    setFormPhone('');
    setFormNote('');
    setFormError('');
    setConfirmDeleteCustomer(false);
    setCustomerModalMode('add');
  };

  const openEditModal = (customer: Customer) => {
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormNote(customer.note);
    setFormError('');
    setConfirmDeleteCustomer(false);
    setCustomerModalMode('edit');
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Enter the customer name.');
      return;
    }
    if (customerModalMode === 'add') {
      onAddCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        note: formNote.trim(),
      });
    } else if (customerModalMode === 'edit' && activeCustomerRecord) {
      onUpdateCustomer(activeCustomerRecord.customer.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        note: formNote.trim(),
      });
    }
    setCustomerModalMode(null);
  };

  return (
    <div className="space-y-6">
      {/* Khata Top Summary Bar (Hidden on mobile when viewing a specific customer detail) */}
      <div className={activeCustomerRecord ? 'hidden lg:block' : 'block'}>
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Udhar Receivable (Baqiya)</p>
            <p className="num-tabular mt-1 text-3xl font-bold text-rose-700">
              {formatMoney(totalReceivable, settings.currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {openBalanceCount} {openBalanceCount === 1 ? 'customer owes' : 'customers owe'} balance
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              {customers.length} total in khata
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Responsive Split-Pane: Customer List (Left 5 cols) + Customer Ledger Detail (Right 7 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Customer Directory */}
        <section
          className={`space-y-3 lg:col-span-5 ${
            activeCustomerRecord ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Search & Sort Controls */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-1">
                {(
                  [
                    {id: 'balance', label: 'Highest Due'},
                    {id: 'recent', label: 'Recent'},
                    {id: 'name', label: 'A–Z'},
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      sortBy === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setOnlyWithDue((prev) => !prev)}
                className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  onlyWithDue
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {onlyWithDue ? 'Showing Due Only' : 'Due Only'}
              </button>
            </div>
          </div>

          {/* Customer List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {visibleCustomers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-display text-base font-semibold text-slate-800">
                  {customers.length === 0 ? 'No customers in khata yet' : 'No matching customers'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {customers.length === 0
                    ? 'Add a customer to track their udhar and payments offline.'
                    : 'Try another search term or show settled customers.'}
                </p>
                {customers.length === 0 && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add First Customer
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleCustomers.map(({customer, balance, lastActivity}) => {
                  const isSelected = activeCustomerRecord?.customer.id === customer.id;
                  const initials = customer.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(customer.id)}
                        className={`flex min-h-[68px] w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors ${
                          isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            balance > 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-teal-50 text-teal-800'
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {customer.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {customer.phone ? customer.phone : customer.note || 'Khata customer'}
                            {lastActivity && (
                              <>
                                <span className="mx-1.5" aria-hidden="true">
                                  ·
                                </span>
                                <span>{formatReadableDate(lastActivity.slice(0, 10))}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={`num-tabular text-sm font-bold ${
                              balance > 0
                                ? 'text-rose-700'
                                : balance < 0
                                  ? 'text-teal-700'
                                  : 'text-slate-600'
                            }`}
                          >
                            {balance === 0
                              ? formatMoney(0, settings.currency)
                              : formatMoney(Math.abs(balance), settings.currency)}
                          </p>
                          <p
                            className={`text-[11px] font-medium ${
                              balance > 0
                                ? 'text-rose-600'
                                : balance < 0
                                  ? 'text-teal-700'
                                  : 'text-slate-400'
                            }`}
                          >
                            {balance > 0
                              ? labels.dueLabel
                              : balance < 0
                                ? labels.advanceLabel
                                : labels.settledLabel}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Customer Detail Ledger Pane */}
        <section
          className={`lg:col-span-7 ${
            activeCustomerRecord ? 'block' : 'hidden lg:block'
          }`}
        >
          {!activeCustomerRecord ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="font-display text-base font-semibold text-slate-800">
                Select a customer to view their khata
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Inspect every udhar entry, record payments received, and share a clear balance summary.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Back Bar */}
              <div className="flex items-center justify-between lg:hidden">
                <button
                  type="button"
                  onClick={() => onSelectCustomer(null)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  All Customers
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(activeCustomerRecord.customer)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-200/60"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>

              {/* Customer Ledger Header Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {activeCustomerRecord.customer.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {activeCustomerRecord.customer.phone && (
                        <a
                          href={`tel:${activeCustomerRecord.customer.phone}`}
                          className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {activeCustomerRecord.customer.phone}
                        </a>
                      )}
                      {activeCustomerRecord.customer.phone && activeCustomerRecord.customer.note && (
                        <span aria-hidden="true">·</span>
                      )}
                      {activeCustomerRecord.customer.note && (
                        <span>{activeCustomerRecord.customer.note}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onShareReminder(activeCustomerRecord.customer, activeCustomerRecord.balance)
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(activeCustomerRecord.customer)}
                      aria-label="Edit customer"
                      className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Balance Summary + Direct Action Buttons */}
                <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {activeCustomerRecord.balance > 0
                        ? labels.dueLabel
                        : activeCustomerRecord.balance < 0
                          ? labels.advanceLabel
                          : labels.settledLabel}
                    </p>
                    <p
                      className={`num-tabular mt-1 text-3xl font-bold ${
                        activeCustomerRecord.balance > 0
                          ? 'text-rose-700'
                          : activeCustomerRecord.balance < 0
                            ? 'text-teal-700'
                            : 'text-slate-900'
                      }`}
                    >
                      {formatMoney(Math.abs(activeCustomerRecord.balance), settings.currency)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:flex">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenCustomerEntry(activeCustomerRecord.customer.id, 'udhar_given')
                      }
                      className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 whitespace-nowrap"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Give {labels.udharGivenShort}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenCustomerEntry(activeCustomerRecord.customer.id, 'udhar_received')
                      }
                      className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
                    >
                      <ArrowDownLeft className="h-4 w-4" />
                      Receive Cash
                    </button>
                  </div>
                </div>
              </div>

              {/* Chronological Customer Statement */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Khata History ({customerLedgerRows.length})
                  </h3>
                  <span className="text-xs text-slate-500">Tap any entry to edit</span>
                </div>

                {customerLedgerRows.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">No entries recorded yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Use the buttons above to record udhar given or cash received.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {customerLedgerRows.map(({tx, runningBalance}) => {
                      const isUdhar = tx.type === 'udhar_given';
                      return (
                        <li key={tx.id}>
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="flex min-h-[64px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {tx.note || (isUdhar ? labels.udharGiven : labels.udharReceived)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                <span
                                  className={
                                    isUdhar
                                      ? 'font-medium text-rose-700'
                                      : 'font-medium text-teal-700'
                                  }
                                >
                                  {isUdhar ? labels.udharGivenShort : labels.udharReceivedShort}
                                </span>
                                <span className="mx-1.5" aria-hidden="true">
                                  ·
                                </span>
                                <span>{formatReadableDate(tx.date)}</span>
                                <span className="mx-1.5" aria-hidden="true">
                                  ·
                                </span>
                                <span>{formatTimeShort(tx.createdAt)}</span>
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p
                                className={`num-tabular text-sm font-bold ${
                                  isUdhar ? 'text-rose-700' : 'text-teal-700'
                                }`}
                              >
                                {isUdhar ? '+' : '−'}
                                {formatMoney(tx.amount, settings.currency)}
                              </p>
                              <p className="num-tabular mt-0.5 text-[11px] text-slate-500">
                                Bal: {formatMoney(runningBalance, settings.currency)}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Customer Sheet */}
      <BottomSheet
        open={customerModalMode !== null}
        title={customerModalMode === 'edit' ? 'Edit Customer' : 'Add Khata Customer'}
        onClose={() => setCustomerModalMode(null)}
      >
        <form onSubmit={handleCustomerSubmit} className="space-y-4">
          <div>
            <label htmlFor="cust-name" className="text-xs font-medium text-slate-600">
              Customer Name *
            </label>
            <input
              id="cust-name"
              type="text"
              placeholder="e.g. Tariq Mahmood"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                setFormError('');
              }}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
            />
          </div>

          <div>
            <label htmlFor="cust-phone" className="text-xs font-medium text-slate-600">
              Phone Number (optional)
            </label>
            <input
              id="cust-phone"
              type="tel"
              placeholder="e.g. 0300-1234567"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
            />
          </div>

          <div>
            <label htmlFor="cust-note" className="text-xs font-medium text-slate-600">
              Address or Note (optional)
            </label>
            <input
              id="cust-note"
              type="text"
              placeholder="e.g. Street 4, pays monthly"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {customerModalMode === 'edit' ? 'Save Changes' : 'Save Customer'}
            </button>

            {customerModalMode === 'edit' && activeCustomerRecord && (
              <div>
                {!confirmDeleteCustomer ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCustomer(true)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Customer &amp; History
                  </button>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2.5">
                    <p className="text-xs text-rose-800">
                      This removes <strong>{activeCustomerRecord.customer.name}</strong> and all their khata entries from this device.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCustomer(false)}
                        className="min-h-[40px] flex-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCustomer(activeCustomerRecord.customer.id);
                          setCustomerModalMode(null);
                        }}
                        className="min-h-[40px] flex-1 rounded-lg bg-rose-700 text-xs font-semibold text-white hover:bg-rose-800"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
