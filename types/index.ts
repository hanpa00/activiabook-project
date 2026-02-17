export type AccountType = 
  | 'ASSET' 
  | 'LIABILITY' 
  | 'EQUITY' 
  | 'INCOME' 
  | 'EXPENSE'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'OTHER_CURRENT_ASSET'
  | 'FIXED_ASSET'
  | 'OTHER_ASSET'
  | 'ACCOUNTS_PAYABLE'
  | 'CREDIT_CARD'
  | 'OTHER_CURRENT_LIABILITY'
  | 'LONG_TERM_LIABILITY'
  | 'COST_OF_GOODS_SOLD'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE';
export type EntryStatus = 'DRAFT' | 'POSTED' | 'ARCHIVED';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string | null;
  created_at?: string;
  balance?: number;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  description?: string;
  reference_number?: string;
  status: EntryStatus;
  created_at: string;
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

// Composite type for data fetching
export interface JournalEntryWithLines extends JournalEntry {
  lines: (JournalLine & { account?: ChartOfAccount })[];
}
