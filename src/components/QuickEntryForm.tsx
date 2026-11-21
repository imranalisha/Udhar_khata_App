import React, {useMemo, useState} from 'react';
import {Trash2, UserPlus} from 'lucide-react';
import {Customer, ShopSettings, Transaction, TransactionType} from '../types/ledger';
import {getLabels} from '../utils/labels';
import {formatMoney, getCustomerBalance, getLocalDateString} from '../utils/storage';

interface QuickEntryFormProps {
  settings: ShopSettings;
  customers: Customer[];
  transactions: Transaction[];
  initialDate?: string;
  initialType?: TransactionType;
  lockedCustomerId?: string;
  editingTransaction?: Transaction | null;
  onSave: (payload: {
    id?: string;
    type: TransactionType;
    amount: number;
    note: string;
    date: string;
    customerId?: string;
    newCustomerName?: string;
    newCustomerPhone?: string;
  }) => void;
  onDelete?: (transactionId: string) => void;
  onCancel?: () => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export const QuickEntryForm: React.FC<QuickEntryFormProps> = ({
  settings,
  customers,
  transactions,
  initialDate,
  initialType = 'cash_sale',
  lockedCustomerId,
  editingTransaction,
  onSave,
  onDelete,
  onCancel,
}) => {
  const labels = getLabels(settings.labelMode);

  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type ?? (lockedCustomerId && initialType === 'cash_sale' ? 'udhar_given' : initialType)
  );
  const [amountStr, setAmountStr] = useState<string>(
    editingTransaction ? String(editingTransaction.amount) : ''
  );
  const [note, setNote] = useState<string>(editingTransaction?.note ?? '');
  const [date, setDate] = useState<string>(
    editingTransaction?.date ?? initialDate ?? getLocalDateString()
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    editingTransaction?.customerId ?? lockedCustomerId ?? customers[0]?.id ?? ''
  );
  const [creatingNewCustomer, setCreatingNewCustomer] = useState<boolean>(
    !lockedCustomerId && customers.length === 0
  );
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const needsCustomer = type === 'udhar_given' || type === 'udhar_received';

  const sortedCustomers = useMemo(() => {
    return customers.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const activeCustomerId = lockedCustomerId ?? selectedCustomerId;
  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === activeCustomerId),
    [customers, activeCustomerId]
  );

  const activeCustomerBalance = useMemo(() => {
    if (!activeCustomerId) return 0;
    return getCustomerBalance(activeCustomerId, transactions);
  }, [activeCustomerId, transactions]);

  const handleQuickAddAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0;
    const next = Math.round((current + delta) * 100) / 100;
    setAmountStr(String(next));
    setError('');
  };

  const handleQuickItem = (itemLabel: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      setNote(itemLabel);
    } else if (!trimmed.toLowerCase().includes(itemLabel.toLowerCase())) {
      setNote(`${trimmed}, ${itemLabel}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }

    if (needsCustomer) {
      if (creatingNewCustomer || (!activeCustomerId && !lockedCustomerId)) {
        if (!newCustomerName.trim()) {
          setError('Enter the customer name for this khata entry.');
          return;
        }
      }
    }

    onSave({
      id: editingTransaction?.id,
      type,
      amount: Math.round(parsedAmount * 100) / 100,
      note: note.trim(),
      date: date || getLocalDateString(),
      customerId: needsCustomer && !creatingNewCustomer ? activeCustomerId : undefined,
      newCustomerName: needsCustomer && creatingNewCustomer ? newCustomerName.trim() : undefined,
      newCustomerPhone: needsCustomer && creatingNewCustomer ? newCustomerPhone.trim() : undefined,
    });

    // Reset fields when used in inline desktop quick-pad mode
    if (!editingTransaction) {
      setAmountStr('');
      setNote('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setError('');
      if (customers.length > 0 && !lockedCustomerId) {
        setCreatingNewCustomer(false);
      }
    }
  };

  const typeTabs: {id: TransactionType; label: string}[] = lockedCustomerId
    ? [
        {id: 'udhar_given', label: labels.udharGivenShort},
        {id: 'udhar_received', label: labels.udharReceivedShort},
      ]
    : [
        {id: 'cash_sale', label: labels.cashSaleShort},
        {id: 'udhar_given', label: labels.udharGivenShort},
        {id: 'udhar_received', label: labels.udharReceivedShort},
      ];

  const submitButtonClass =
    type === 'udhar_given'
      ? 'bg-rose-700 hover:bg-rose-800 focus-visible:outline-rose-700'
      : 'bg-teal-700 hover:bg-teal-800 focus-visible:outline-teal-700';

  const submitLabel = editingTransaction
    ? 'Update Entry'
    : type === 'cash_sale'
      ? `Save ${labels.cashSaleShort}`
      : type === 'udhar_given'
        ? `Save ${labels.udharGivenShort}`
        : `Save ${labels.udharReceivedShort}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Entry Type Segmented Control */}
      <div
        className={`grid gap-1 rounded-xl bg-slate-100 p-1 ${
          typeTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}
        role="tablist"
        aria-label="Entry type"
      >
        {typeTabs.map((tab) => {
          const isActive = type === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setType(tab.id);
                setError('');
              }}
              className={`min-h-[44px] rounded-lg px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? tab.id === 'udhar_given'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="entry-amount" className="text-xs font-medium text-slate-600">
            Amount ({settings.currency})
          </label>
          {amountStr && (
            <button
              type="button"
              onClick={() => setAmountStr('')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg font-medium text-slate-400">
            {settings.currency}
          </span>
          <input
            id="entry-amount"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={amountStr}
            onChange={(e) => {
              setAmountStr(e.target.value);
              setError('');
            }}
            className="num-tabular w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-14 pr-4 text-3xl font-semibold text-slate-900 placeholder:text-slate-300 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15"
          />
        </div>

        {/* Fast Additive Amount Buttons */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAddAmount(amt)}
              className="num-tabular min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              +{amt}
            </button>
          ))}
          {type === 'udhar_received' && activeCustomerBalance > 0 && !creatingNewCustomer && (
            <button
              type="button"
              onClick={() => {
                setAmountStr(String(activeCustomerBalance));
                setError('');
              }}
              className="min-h-[38px] rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100"
            >
              Full Due ({formatMoney(activeCustomerBalance, settings.currency)})
            </button>
          )}
        </div>
      </div>

      {/* Customer Selector (for Udhar Given / Payment Received) */}
      {needsCustomer && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="entry-customer" className="text-xs font-medium text-slate-600">
              Customer
            </label>
            {!lockedCustomerId && sortedCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCreatingNewCustomer((prev) => !prev);
                  setError('');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {creatingNewCustomer ? 'Pick Existing' : 'New Customer'}
              </button>
            )}
          </div>

          {lockedCustomerId && activeCustomer ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
              <span className="font-semibold text-slate-900">{activeCustomer.name}</span>
              <span className="num-tabular text-xs font-medium text-slate-600">
                {activeCustomerBalance > 0
                  ? `${labels.dueLabel}: ${formatMoney(activeCustomerBalance, settings.currency)}`
                  : labels.settledLabel}
              </span>
            </div>
          ) : creatingNewCustomer || sortedCustomers.length === 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Customer full name *"
                value={newCustomerName}
                onChange={(e) => {
                  setNewCustomerName(e.target.value);
                  setError('');
                }}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <select
                id="entry-customer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              >
                {sortedCustomers.map((c) => {
                  const bal = getCustomerBalance(c.id, transactions);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {bal > 0 ? ` — Due ${formatMoney(bal, settings.currency)}` : ''}
                    </option>
                  );
                })}
              </select>
              {activeCustomer && (
                <p className="text-xs text-slate-500">
                  Current balance:{' '}
                  <span
                    className={`num-tabular font-semibold ${
                      activeCustomerBalance > 0 ? 'text-rose-700' : 'text-teal-700'
                    }`}
                  >
                    {activeCustomerBalance > 0
                      ? `${formatMoney(activeCustomerBalance, settings.currency)} ${labels.dueLabel}`
                      : labels.settledLabel}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Item / Note Input + Quick Items */}
      <div>
        <label htmlFor="entry-note" className="text-xs font-medium text-slate-600">
          {type === 'udhar_received' ? 'Payment Note (optional)' : 'Items Sold / Note (optional)'}
        </label>
        <input
          id="entry-note"
          type="text"
          placeholder={
            type === 'udhar_received'
              ? 'e.g. Cash received at counter'
              : 'e.g. Sugar 2kg, Flour 5kg, Tea'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
        />

        {type !== 'udhar_received' && settings.quickItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {settings.quickItems.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleQuickItem(item)}
                className="min-h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
              >
                + {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Field */}
      <div>
        <label htmlFor="entry-date" className="text-xs font-medium text-slate-600">
          Date
        </label>
        <input
          id="entry-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className={`min-h-[48px] w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 ${submitButtonClass}`}
        >
          {submitLabel}
        </button>

        {editingTransaction && onDelete && (
          <div className="pt-1">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Entry
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(editingTransaction.id)}
                  className="min-h-[44px] flex-1 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        )}

        {onCancel && !editingTransaction && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
