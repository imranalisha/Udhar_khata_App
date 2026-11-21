import React, {useMemo, useState} from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import {Customer, ShopSettings, Transaction, TransactionType} from '../types/ledger';
import {getLabels, getTransactionTypeLabel} from '../utils/labels';
import {
  formatMoney,
  formatReadableDate,
  formatTimeShort,
  getCustomerBalance,
  getLocalDateString,
  shiftDateString,
} from '../utils/storage';
import {PWAInstallButton} from './PWAInstallButton';
import {QuickEntryForm} from './QuickEntryForm';

interface TodayViewProps {
  settings: ShopSettings;
  customers: Customer[];
  transactions: Transaction[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenNewEntryModal: (defaultType: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onQuickSave: (payload: {
    id?: string;
    type: TransactionType;
    amount: number;
    note: string;
    date: string;
    customerId?: string;
    newCustomerName?: string;
    newCustomerPhone?: string;
  }) => void;
  onJumpToCustomer: (customerId: string) => void;
}

type FilterOption = 'all' | TransactionType;

export const TodayView: React.FC<TodayViewProps> = ({
  settings,
  customers,
  transactions,
  selectedDate,
  onSelectDate,
  onOpenNewEntryModal,
  onEditTransaction,
  onQuickSave,
  onJumpToCustomer,
}) => {
  const labels = getLabels(settings.labelMode);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = getLocalDateString();

  // Build 7-day window ending on today (or anchored around selectedDate if older)
  const dateStrip = useMemo(() => {
    const endAnchor = selectedDate > todayStr ? selectedDate : todayStr;
    const days: {dateStr: string; dayShort: string; dayNum: string; isToday: boolean}[] = [];
    for (let offset = -6; offset <= 0; offset++) {
      const ds = shiftDateString(endAnchor, offset);
      const [y, m, d] = ds.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      days.push({
        dateStr: ds,
        dayShort: dt.toLocaleDateString(undefined, {weekday: 'short'}),
        dayNum: String(d),
        isToday: ds === todayStr,
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  const dayTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date === selectedDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transactions, selectedDate]);

  const totals = useMemo(() => {
    let cashSales = 0;
    let udharGiven = 0;
    let udharReceived = 0;
    for (const tx of dayTransactions) {
      if (tx.type === 'cash_sale') cashSales += tx.amount;
      else if (tx.type === 'udhar_given') udharGiven += tx.amount;
      else if (tx.type === 'udhar_received') udharReceived += tx.amount;
    }
    return {
      cashSales,
      udharGiven,
      udharReceived,
      totalSales: cashSales + udharGiven,
      cashInDrawer: cashSales + udharReceived,
    };
  }, [dayTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dayTransactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (!q) return true;
      const customerName = tx.customerId ? (customerMap.get(tx.customerId)?.name ?? '') : '';
      return (
        tx.note.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    });
  }, [dayTransactions, filter, searchQuery, customerMap]);

  const topDebtors = useMemo(() => {
    return customers
      .map((c) => ({customer: c, balance: getCustomerBalance(c.id, transactions)}))
      .filter((item) => item.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 4);
  }, [customers, transactions]);

  const filterTabs: {id: FilterOption; label: string; count: number}[] = [
    {id: 'all', label: 'All', count: dayTransactions.length},
    {
      id: 'cash_sale',
      label: labels.cashSaleShort,
      count: dayTransactions.filter((t) => t.type === 'cash_sale').length,
    },
    {
      id: 'udhar_given',
      label: labels.udharGivenShort,
      count: dayTransactions.filter((t) => t.type === 'udhar_given').length,
    },
    {
      id: 'udhar_received',
      label: labels.udharReceivedShort,
      count: dayTransactions.filter((t) => t.type === 'udhar_received').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Date Navigation Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {formatReadableDate(selectedDate)} Register
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {settings.shopName}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>
              {dayTransactions.length} {dayTransactions.length === 1 ? 'entry' : 'entries'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton variant="inline" />

          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => onSelectDate(shiftDateString(selectedDate, -1))}
              aria-label="Previous day"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="relative flex min-h-[40px] cursor-pointer items-center gap-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="whitespace-nowrap">{selectedDate}</span>
              <input
                type="date"
                aria-label="Choose date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onSelectDate(e.target.value);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <button
              type="button"
              onClick={() => onSelectDate(shiftDateString(selectedDate, 1))}
              aria-label="Next day"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal 7-Day Date Scroller */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {dateStrip.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex min-h-[54px] min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-all ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`text-[11px] font-medium ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {day.isToday ? 'Today' : day.dayShort}
              </span>
              <span className="num-tabular text-sm font-semibold">{day.dayNum}</span>
            </button>
          );
        })}
        {selectedDate !== todayStr && (
          <button
            type="button"
            onClick={() => onSelectDate(todayStr)}
            className="min-h-[54px] shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-3.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 whitespace-nowrap"
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* Full-Width 4-Metric Daily Summary Strip */}
      <section
        aria-label="Daily totals"
        className="grid grid-cols-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Cash in Drawer</p>
          <p className="num-tabular mt-1.5 text-xl font-bold text-teal-800 sm:text-2xl">
            {formatMoney(totals.cashInDrawer, settings.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sales + Wasooli</p>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-100 sm:border-l-0">
          <p className="text-xs font-medium text-slate-500">{labels.cashSaleShort}</p>
          <p className="num-tabular mt-1.5 text-xl font-bold text-slate-900 sm:text-2xl">
            {formatMoney(totals.cashSales, settings.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Direct counter cash</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">{labels.udharGivenShort}</p>
          <p className="num-tabular mt-1.5 text-xl font-bold text-rose-700 sm:text-2xl">
            {formatMoney(totals.udharGiven, settings.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Added to khata</p>
        </div>

        <div className="p-4 sm:p-5 border-l border-slate-100 sm:border-l-0">
          <p className="text-xs font-medium text-slate-500">{labels.udharReceivedShort}</p>
          <p className="num-tabular mt-1.5 text-xl font-bold text-teal-700 sm:text-2xl">
            {formatMoney(totals.udharReceived, settings.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total sales: {formatMoney(totals.totalSales, settings.currency)}</p>
        </div>
      </section>

      {/* Mobile Primary One-Tap Actions (Hidden on Desktop where Quick Pad sits on the right) */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => onOpenNewEntryModal('cash_sale')}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-xs transition-transform active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{labels.cashSaleShort}</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenNewEntryModal('udhar_given')}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition-transform active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{labels.udharGivenShort} / Khata</span>
        </button>
      </div>

      {/* Main 2-Column Desktop Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Daily Entry List */}
        <section className="space-y-4 lg:col-span-8">
          {/* Filter Tabs & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1">
              {filterTabs.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`min-h-[38px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search item or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>
          </div>

          {/* Ledger Entries List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {filteredTransactions.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-display text-base font-semibold text-slate-800">
                  {dayTransactions.length === 0
                    ? `No entries recorded for ${formatReadableDate(selectedDate)}`
                    : 'No matching entries found'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {dayTransactions.length === 0
                    ? 'Record a cash sale or customer udhar to start your daily register.'
                    : 'Try clearing the search box or switching the filter tab.'}
                </p>
                {dayTransactions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenNewEntryModal('cash_sale')}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 lg:hidden"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Sale
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const customer = tx.customerId ? customerMap.get(tx.customerId) : undefined;
                  const typeLabel = getTransactionTypeLabel(tx.type, settings.labelMode);

                  const isUdhar = tx.type === 'udhar_given';
                  const isReceived = tx.type === 'udhar_received';

                  return (
                    <li key={tx.id}>
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="flex min-h-[68px] w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5"
                      >
                        {/* Functional transaction direction indicator */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isUdhar
                              ? 'bg-rose-50 text-rose-700'
                              : isReceived
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                          aria-hidden="true"
                        >
                          {isUdhar ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : isReceived ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : (
                            <Wallet className="h-5 w-5" />
                          )}
                        </div>

                        {/* Middle Stacked Title + Clean Unboxed Metadata */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {customer ? customer.name : tx.note || labels.cashSale}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                            <span
                              className={
                                isUdhar
                                  ? 'font-medium text-rose-700'
                                  : isReceived
                                    ? 'font-medium text-teal-700'
                                    : 'font-medium text-slate-600'
                              }
                            >
                              {typeLabel}
                            </span>
                            {customer && tx.note && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate max-w-[200px] sm:max-w-[300px]">
                                  {tx.note}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{formatTimeShort(tx.createdAt)}</span>
                          </div>
                        </div>

                        {/* Right Tabular Amount */}
                        <div className="shrink-0 text-right">
                          <p
                            className={`num-tabular text-base font-semibold ${
                              isUdhar
                                ? 'text-rose-700'
                                : isReceived
                                  ? 'text-teal-700'
                                  : 'text-slate-900'
                            }`}
                          >
                            {isUdhar ? '−' : '+'}
                            {formatMoney(tx.amount, settings.currency)}
                          </p>
                          <p className="text-[11px] text-slate-400">Tap to edit</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right 4 Columns (Desktop): Instant Quick Entry Pad + Top Udhar Balances */}
        <aside className="hidden space-y-6 lg:col-span-4 lg:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">Quick Entry</h2>
            <p className="mt-0.5 mb-4 text-xs text-slate-500">
              Saves offline immediately for {formatReadableDate(selectedDate)}.
            </p>
            <QuickEntryForm
              settings={settings}
              customers={customers}
              transactions={transactions}
              initialDate={selectedDate}
              onSave={onQuickSave}
            />
          </div>

          {topDebtors.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Top Udhar Balances
                </h3>
                <span className="text-xs text-slate-500">Tap to view</span>
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {topDebtors.map(({customer, balance}) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => onJumpToCustomer(customer.id)}
                      className="flex min-h-[48px] w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-teal-800"
                    >
                      <span className="truncate text-sm font-medium text-slate-800">
                        {customer.name}
                      </span>
                      <span className="num-tabular shrink-0 text-sm font-semibold text-rose-700">
                        {formatMoney(balance, settings.currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
