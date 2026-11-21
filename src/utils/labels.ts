import {LabelMode, TransactionType} from '../types/ledger';

export interface AppLabels {
  cashSale: string;
  cashSaleShort: string;
  udharGiven: string;
  udharGivenShort: string;
  udharReceived: string;
  udharReceivedShort: string;
  dueLabel: string;
  settledLabel: string;
  advanceLabel: string;
  todayTab: string;
  khataTab: string;
  summaryTab: string;
}

export function getLabels(mode: LabelMode): AppLabels {
  if (mode === 'bilingual') {
    return {
      cashSale: 'Cash Sale · Naqad',
      cashSaleShort: 'Cash (Naqad)',
      udharGiven: 'Udhar Given · Khata',
      udharGivenShort: 'Udhar',
      udharReceived: 'Payment Received · Wasooli',
      udharReceivedShort: 'Wasooli',
      dueLabel: 'Udhar Due',
      settledLabel: 'Cleared',
      advanceLabel: 'Advance',
      todayTab: 'Today',
      khataTab: 'Khata',
      summaryTab: 'Backup',
    };
  }

  return {
    cashSale: 'Cash Sale',
    cashSaleShort: 'Cash',
    udharGiven: 'Credit Given',
    udharGivenShort: 'Credit',
    udharReceived: 'Payment Received',
    udharReceivedShort: 'Received',
    dueLabel: 'Balance Due',
    settledLabel: 'Settled',
    advanceLabel: 'Advance',
    todayTab: 'Today',
    khataTab: 'Khata',
    summaryTab: 'Backup',
  };
}

export function getTransactionTypeLabel(type: TransactionType, mode: LabelMode): string {
  const labels = getLabels(mode);
  if (type === 'cash_sale') return labels.cashSaleShort;
  if (type === 'udhar_given') return labels.udharGivenShort;
  return labels.udharReceivedShort;
}
