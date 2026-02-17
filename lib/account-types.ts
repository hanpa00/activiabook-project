import { AccountType } from "@/types"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
  BANK: "Bank",
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  OTHER_CURRENT_ASSET: "Other Current Asset",
  FIXED_ASSET: "Fixed Asset",
  OTHER_ASSET: "Other Asset",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  CREDIT_CARD: "Credit Card",
  OTHER_CURRENT_LIABILITY: "Other Current Liability",
  LONG_TERM_LIABILITY: "Long Term Liability",
  COST_OF_GOODS_SOLD: "Cost of Goods Sold",
  OTHER_INCOME: "Other Income",
  OTHER_EXPENSE: "Other Expense",
}

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export function getAccountCategory(type: AccountType): AccountCategory {
  switch (type) {
    case 'BANK':
    case 'ACCOUNTS_RECEIVABLE':
    case 'OTHER_CURRENT_ASSET':
    case 'FIXED_ASSET':
    case 'OTHER_ASSET':
    case 'ASSET':
      return 'ASSET'
    case 'ACCOUNTS_PAYABLE':
    case 'CREDIT_CARD':
    case 'OTHER_CURRENT_LIABILITY':
    case 'LONG_TERM_LIABILITY':
    case 'LIABILITY':
      return 'LIABILITY'
    case 'EQUITY':
      return 'EQUITY'
    case 'INCOME':
    case 'OTHER_INCOME':
      return 'INCOME'
    case 'EXPENSE':
    case 'COST_OF_GOODS_SOLD':
    case 'OTHER_EXPENSE':
      return 'EXPENSE'
  }
}

export function getAccountTypeColor(type: AccountType): string {
  const category = getAccountCategory(type)
  switch (category) {
    case 'ASSET': return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-emerald-200"
    case 'LIABILITY': return "bg-orange-100 text-orange-800 hover:bg-orange-100/80 border-orange-200"
    case 'EQUITY': return "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200"
    case 'INCOME': return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80 border-indigo-200"
    case 'EXPENSE': return "bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-rose-200"
    default: return "bg-gray-100 text-gray-800"
  }
}
