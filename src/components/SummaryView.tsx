import React, {useMemo, useRef, useState} from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {LabelMode, LedgerStore, ShopSettings} from '../types/ledger';
import {getLabels} from '../utils/labels';
import {
  buildCsvExport,
  downloadTextFile,
  formatMoney,
  getLocalDateString,
  parseBackupJson,
  shiftDateString,
} from '../utils/storage';
import {PWAInstallButton} from './PWAInstallButton';

interface SummaryViewProps {
  store: LedgerStore;
  onUpdateSettings: (next: ShopSettings) => void;
  onRestoreBackup: (restored: LedgerStore) => void;
  onClearAllData: () => void;
  onNotify: (message: string) => void;
}

const CURRENCY_PRESETS = ['Rs.', '₹', '$', '£', 'AED', 'SAR'];

export const SummaryView: React.FC<SummaryViewProps> = ({
  store,
  onUpdateSettings,
  onRestoreBackup,
  onClearAllData,
  onNotify,
}) => {
  const {settings, transactions} = store;
  const labels = getLabels(settings.labelMode);

  const [shopName, setShopName] = useState(settings.shopName);
  const [currency, setCurrency] = useState(settings.currency);
  const [newQuickItem, setNewQuickItem] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const todayStr = getLocalDateString();
  const currentMonthPrefix = todayStr.slice(0, 7);

  // Last 7 days daily breakdown
  const last7Days = useMemo(() => {
    const days: {
      dateStr: string;
      label: string;
      cashSales: number;
      udharGiven: number;
      udharReceived: number;
      totalSales: number;
    }[] = [];

    for (let offset = -6; offset <= 0; offset++) {
      const ds = shiftDateString(todayStr, offset);
      const [y, m, d] = ds.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const label =
        offset === 0
          ? 'Today'
          : dt.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric'});

      let cashSales = 0;
      let udharGiven = 0;
      let udharReceived = 0;

      for (const tx of transactions) {
        if (tx.date !== ds) continue;
        if (tx.type === 'cash_sale') cashSales += tx.amount;
        else if (tx.type === 'udhar_given') udharGiven += tx.amount;
        else if (tx.type === 'udhar_received') udharReceived += tx.amount;
      }

      days.push({
        dateStr: ds,
        label,
        cashSales,
        udharGiven,
        udharReceived,
        totalSales: cashSales + udharGiven,
      });
    }
    return days;
  }, [transactions, todayStr]);

  const maxDaySales = useMemo(() => {
    return Math.max(1, ...last7Days.map((d) => d.totalSales));
  }, [last7Days]);

  const monthTotals = useMemo(() => {
    let cashSales = 0;
    let udharGiven = 0;
    let udharReceived = 0;
    let count = 0;

    for (const tx of transactions) {
      if (!tx.date.startsWith(currentMonthPrefix)) continue;
      count++;
      if (tx.type === 'cash_sale') cashSales += tx.amount;
      else if (tx.type === 'udhar_given') udharGiven += tx.amount;
      else if (tx.type === 'udhar_received') udharReceived += tx.amount;
    }

    return {
      cashSales,
      udharGiven,
      udharReceived,
      totalSales: cashSales + udharGiven,
      cashCollected: cashSales + udharReceived,
      count,
    };
  }, [transactions, currentMonthPrefix]);

  const monthName = useMemo(() => {
    const [y, m] = currentMonthPrefix.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [currentMonthPrefix]);

  const handleSaveShopInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      shopName: shopName.trim() || 'My Shop',
      currency: currency.trim() || 'Rs.',
    });
    onNotify('Shop settings saved.');
  };

  const handleLabelModeChange = (mode: LabelMode) => {
    onUpdateSettings({...settings, labelMode: mode});
    onNotify(mode === 'bilingual' ? 'Switched to English + Urdu labels.' : 'Switched to English labels.');
  };

  const handleAddQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuickItem.trim();
    if (!trimmed) return;
    if (settings.quickItems.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setNewQuickItem('');
      return;
    }
    onUpdateSettings({
      ...settings,
      quickItems: [...settings.quickItems, trimmed],
    });
    setNewQuickItem('');
  };

  const handleRemoveQuickItem = (item: string) => {
    onUpdateSettings({
      ...settings,
      quickItems: settings.quickItems.filter((i) => i !== item),
    });
  };

  const handleExportJson = () => {
    const filename = `sada-khata-backup-${todayStr}.json`;
    downloadTextFile(filename, JSON.stringify(store, null, 2), 'application/json');
    onNotify('Offline backup downloaded.');
  };

  const handleExportCsv = () => {
    const filename = `sada-khata-ledger-${todayStr}.csv`;
    const csv = buildCsvExport(store);
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
    onNotify('CSV spreadsheet exported.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseBackupJson(text);
      if (!parsed) {
        onNotify('Could not read backup file. Please choose a valid Sada Khata JSON backup.');
        return;
      }
      onRestoreBackup(parsed);
      setShopName(parsed.settings.shopName);
      setCurrency(parsed.settings.currency);
      onNotify(`Restored ${parsed.customers.length} customers and ${parsed.transactions.length} entries.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Summary &amp; Offline Backup
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          All records stay privately on this device — zero ads, zero internet required.
        </p>
      </div>

      {/* Install PWA Card */}
      <PWAInstallButton variant="card" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left 7 Columns: Monthly & 7-Day Sales Summary */}
        <section className="space-y-6 lg:col-span-7">
          {/* Current Month Totals */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">{monthName}</h2>
              <span className="text-xs text-slate-500">{monthTotals.count} entries</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Total Sales</p>
                <p className="num-tabular mt-1 text-lg font-bold text-slate-900">
                  {formatMoney(monthTotals.totalSales, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cash Collected</p>
                <p className="num-tabular mt-1 text-lg font-bold text-teal-800">
                  {formatMoney(monthTotals.cashCollected, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{labels.udharGivenShort}</p>
                <p className="num-tabular mt-1 text-lg font-bold text-rose-700">
                  {formatMoney(monthTotals.udharGiven, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{labels.udharReceivedShort}</p>
                <p className="num-tabular mt-1 text-lg font-bold text-teal-700">
                  {formatMoney(monthTotals.udharReceived, settings.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* 7-Day Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">Last 7 Days</h2>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-teal-700" aria-hidden="true" />
                  {labels.cashSaleShort}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
                  {labels.udharGivenShort}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              {last7Days.map((day) => {
                const cashPct = Math.round((day.cashSales / maxDaySales) * 100);
                const udharPct = Math.round((day.udharGiven / maxDaySales) * 100);
                return (
                  <div key={day.dateStr} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{day.label}</span>
                      <span className="num-tabular font-semibold text-slate-900">
                        {formatMoney(day.totalSales, settings.currency)}
                        {day.udharReceived > 0 && (
                          <span className="ml-2 font-normal text-teal-700">
                            (+{formatMoney(day.udharReceived, settings.currency)} {labels.udharReceivedShort})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      {day.cashSales > 0 && (
                        <div
                          className="h-full bg-teal-700 transition-all"
                          style={{width: `${cashPct}%`}}
                        />
                      )}
                      {day.udharGiven > 0 && (
                        <div
                          className="h-full bg-rose-600 transition-all"
                          style={{width: `${udharPct}%`}}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline Backup & Export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Offline Backup &amp; Export
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Save a backup file to your phone or SD card so you can restore your khata if you change phones.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Save JSON Backup
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                <FileSpreadsheet className="h-4 w-4 text-teal-700" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                <Upload className="h-4 w-4 text-slate-600" />
                Restore Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {/* Start Fresh / Clear Data */}
            <div className="border-t border-slate-100 pt-4">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-rose-700 hover:text-rose-800"
                >
                  {store.isSampleData ? (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Clear Sample Data &amp; Start Fresh
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Clear All Entries &amp; Customers
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-rose-900">
                    {store.isSampleData
                      ? 'Clear the example entries so you can start recording your real shop sales?'
                      : 'Delete all sales and customer khata records from this device? Save a backup first if needed.'}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllData();
                        setConfirmClear(false);
                      }}
                      className="min-h-[40px] rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800"
                    >
                      Yes, Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right 5 Columns: Shop Preferences & Quick Items */}
        <aside className="space-y-6 lg:col-span-5">
          {/* Shop Details */}
          <form
            onSubmit={handleSaveShopInfo}
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
          >
            <h2 className="font-display text-base font-bold text-slate-900">Shop Preferences</h2>

            <div>
              <label htmlFor="shop-name" className="text-xs font-medium text-slate-600">
                Shop Name
              </label>
              <input
                id="shop-name"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Barkat General Store"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>

            <div>
              <label htmlFor="shop-currency" className="text-xs font-medium text-slate-600">
                Currency Symbol
              </label>
              <input
                id="shop-currency"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={6}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CURRENCY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCurrency(preset)}
                    className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      currency === preset
                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600">Register Labels</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => handleLabelModeChange('bilingual')}
                  className={`min-h-[40px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                    settings.labelMode === 'bilingual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English + Urdu
                </button>
                <button
                  type="button"
                  onClick={() => handleLabelModeChange('english')}
                  className={`min-h-[40px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                    settings.labelMode === 'english'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English Only
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[46px] w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              Save Shop Settings
            </button>
          </form>

          {/* Customizable Quick Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Quick-Tap Items</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Common items shown inside the entry pad for faster sales logging.
              </p>
            </div>

            <form onSubmit={handleAddQuickItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Add item (e.g. Ghee 1kg)"
                value={newQuickItem}
                onChange={(e) => setNewQuickItem(e.target.value)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              <button
                type="submit"
                aria-label="Add quick item"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-slate-900 px-3 text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {settings.quickItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRemoveQuickItem(item)}
                  title="Click to remove"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <span>{item}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
