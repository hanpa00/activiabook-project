
import Papa from 'papaparse';

export interface JournalLineAI {
  account_id: string;
  debit: number;
  credit: number;
  line_description: string;
}

export interface JournalEntryAI {
  date: string;
  description: string;
  lines: JournalLineAI[];
}

export interface AIProcessingResult {
  entries: JournalEntryAI[];
}

/**
 * Categorizes CSV rows using OpenClaw AI.
 */
export async function processCsvWithAI(
  csvData: string,
  chartOfAccounts: any[]
): Promise<AIProcessingResult> {
  const gatewayHost = process.env.OPENCLAW_GATEWAY_HOST || 'http://localhost:8081';
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!gatewayToken) {
    throw new Error("OPENCLAW_GATEWAY_TOKEN is not configured");
  }

  // 1. Prepare data for OpenClaw
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  const rows = parsed.data.map((row: any, index: number) => ({
    rowId: (index + 1).toString(),
    date: row.date || row.Date || '',
    description: row.description || row.Description || row.Memo || '',
    amount: parseFloat(row.amount || row.Amount || '0') || 0,
    bankType: row.type || row.Type || 'UNKNOWN',
    raw: row
  }));

  // Derive taxonomy and account map from COA
  const taxonomy = Array.from(new Set(chartOfAccounts.map(a => a.type)));
  const accountMap: Record<string, string> = {};

  // map common types to specific accounts if found
  const findAccount = (type: string, namePart?: string) => {
    return chartOfAccounts.find(a =>
      a.type === type && (!namePart || a.name.toLowerCase().includes(namePart.toLowerCase()))
    )?.name;
  };

  accountMap['cash'] = findAccount('Asset', 'Cash') || findAccount('Asset') || 'Cash';
  accountMap['ar'] = findAccount('Asset', 'Receivable') || 'Accounts Receivable';
  accountMap['ap'] = findAccount('Liability', 'Payable') || 'Accounts Payable';
  accountMap['income'] = findAccount('Revenue') || findAccount('Income') || 'Income';
  accountMap['expense'] = findAccount('Expense') || 'Expense';
  accountMap['equity'] = findAccount('Equity') || 'Equity';

  const payload = {
    tool: "ledger_categorize_csv",
    sessionKey: "main",
    dryRun: false,
    args: {
      requestId: `import_${Date.now()}`,
      currency: "USD",
      taxonomy,
      accountMap,
      options: {
        createJournalLines: true,
        confidenceThreshold: 0.1,
        strictMode: false
      },
      rows
    }
  };

  // 2. Call OpenClaw Gateway
  const response = await fetch(`${gatewayHost}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenClaw Gateway Error:", errorText);
    throw new Error(`OpenClaw Gateway returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || "OpenClaw categorization failed");
  }

  // 3. Map OpenClaw result back to AIProcessingResult
  // OpenClaw returns rows with journalEntry objects.
  const entries: JournalEntryAI[] = [];

  result.result.rows.forEach((row: any) => {
    if (row.journalEntry) {
      const lines: JournalLineAI[] = row.journalEntry.lines.map((l: any) => {
        // Map account name back to account_id
        const account = chartOfAccounts.find(a => a.name === l.account);
        return {
          account_id: account?.id || "BALANCING_REQUIRED",
          debit: l.debit || 0,
          credit: l.credit || 0,
          line_description: l.memo || row.journalEntry.memo
        };
      });

      entries.push({
        date: row.journalEntry.date,
        description: row.journalEntry.memo,
        lines
      });
    }
  });

  return { entries };
}
