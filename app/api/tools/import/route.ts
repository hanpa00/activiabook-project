
import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const format = formData.get('format') as string
        const customerId = formData.get('customerId') as string

        if (!file || !customerId) {
            return NextResponse.json({ error: "File and Customer ID are required" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        let rows: any[] = []

        // 2. Parse File
        if (format === 'csv') {
            const text = buffer.toString('utf-8')
            const result = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                transformHeader: (h) => h.trim() // Ensure headers are clean
            })
            if (result.errors.length > 0) {
                return NextResponse.json({ error: `CSV Parsing Error: ${result.errors[0].message}` }, { status: 400 })
            }
            rows = result.data
        } else if (format === 'xls') {
            const workbook = XLSX.read(buffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            rows = XLSX.utils.sheet_to_json(sheet)
        } else if (format === 'pdf') {
            return NextResponse.json({ error: "PDF Import is not supported" }, { status: 400 })
        } else {
            return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: "No data found in file" }, { status: 400 })
        }

        // 3. Process Account Definitions & Hierarchy
        // We need to fetch all existing accounts first to avoid duplicates
        const { data: existingAccounts, error: accountsError } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('customer_id', customerId)

        if (accountsError) throw new Error(accountsError.message)

        // Maps to track accounts: Code -> ID, Name -> ID (for hierarchy resolution)
        const accountCodeMap = new Map<string, string>()
        const accountNameMap = new Map<string, string>() // Key could be hierarchical name or just name? 
        // Hierarchy is usually unique by Name within a Parent. But globally unqiue?
        // Let's assume Name is unique per customer for simplicity if hierarchy is flattened string.
        // Or better: Reconstruct hierarchy step by step.

        existingAccounts?.forEach(acc => {
            accountCodeMap.set(acc.code, acc.id)
            accountNameMap.set(acc.name, acc.id) // Note: simple name
            // If we have full path logic, we might need more complex map.
            // But let's build it up.
        })

        // Helper to find/create account
        const ensureAccount = async (code: string, name: string, type: string, parentId: string | null): Promise<string> => {
            // Check by Code first (primary key logic usually)
            if (accountCodeMap.has(code)) {
                // Update parent? Maybe.
                return accountCodeMap.get(code)!
            }

            // Create
            const { data, error } = await supabase.from('chart_of_accounts').insert({
                user_id: user.id,
                customer_id: customerId,
                code,
                name,
                type,
                parent_id: parentId
            }).select('id').single()

            if (error) throw new Error(`Failed to create account ${code} (${name}): ${error.message}`)

            accountCodeMap.set(code, data.id)
            return data.id
        }

        // Helper to resolve hierarchy string "Parent::Child"
        const resolveHierarchy = async (fullAccountName: string, finalCode: string, finalType: string): Promise<string> => {
            const parts = fullAccountName.split('::').map(s => s.trim())
            let parentId: string | null = null

            for (let i = 0; i < parts.length; i++) {
                const partName = parts[i]
                const isLast = i === parts.length - 1

                // For intermediate parents, we might not know the code or type!
                // Logic:
                // If it's the last part, we use finalCode and finalType.
                // If it's a parent, we need to find it by NAME.
                // Issue: What if parent doesn't exist and we don't have its code?
                // Constraint: "export the account code... prefix parent's name".
                // The export row has "Account Code" for the leaf. It doesn't give codes for parents.
                // However, parents SHOULD appear as their own rows in the export!
                // "Include all Account information... export the account code...".
                // So prompts suggests we get rows for ALL accounts.
                // So we can assume parents are processed in their own rows?
                // Limitation: If file order is random, we might process Child before Parent.
                // Fix: Multi-pass or create Parents on demand?
                // If we create on demand without code, we fail constraint 'code not null'.
                // Assumption: The file contains rows for parents too.
                // We should process rows sorted by hierarchy depth? Or just process "Account Definition" rows first.
                // If we encounter a parent in hierarchy string that doesn't exist yet, we can't create it without code.
                // So we MUST hope it exists or is defined in another row.

                // Let's try to find parent by Name.
                // BUT Name is not unique globally? maybe unique under parent?
                // Simplified: Assume strictly unique names or we can't link.

                if (isLast) {
                    // This is the account we are defining
                    return await ensureAccount(finalCode, partName, finalType, parentId)
                } else {
                    // Find parent.
                    // We need to look up by Name. 
                    // Problem: We only have a Map<Code, ID>. We need Map<Name, ID>.
                    // And what if multiple accounts have same name (different codes)?
                    // We'll search existingAccounts array?
                    // Optimization: Map<Name, ID>.
                    // If duplicate names exist, this is ambiguous.
                    // For now, assume unique names.

                    // We search our in-memory map.
                    let pId = [...accountNameMap.entries()].find(([n, id]) => n === partName)?.[1]

                    // If not found in map, check if we processed it in this run?
                    // We need to keep accountNameMap updated too.

                    if (!pId) {
                        // We can't create it because we lack Code.
                        // Warning? throw?
                        // "Account Definition" rows should cover it.
                        // We might need to process rows in order of hierarchy?
                        // Or 2-pass: 
                        // Pass 1: Collect all Code->Name/Type/Hierarchy.
                        // Pass 2: Create all, ordered by depth.
                    }
                    parentId = pId || null // If null, child becomes top-level? Or we fail?
                }
            }
            return parentId || '' // Should return last ID
        }

        // PRE-PROCESSING: Identification of Account Definition Rows vs Entry Rows
        // Strategy:
        // Rows where (Debit is blank/0 AND Credit is blank/0) -> Account Definition
        // Else -> Journal Entry

        const accountRows: any[] = []
        const entryRows: any[] = []

        for (const row of rows) {
            // Flexible header matching
            const debit = row['Debit'] || row['debit'] || 0
            const credit = row['Credit'] || row['credit'] || 0

            // Allow "0" strings or empty strings
            const isZero = (v: any) => !v || v === '' || Number(v) === 0

            if (isZero(debit) && isZero(credit)) {
                // Check if it has Account Code (essential)
                if (row['Account Code'] || row['Code']) {
                    accountRows.push(row)
                }
            } else {
                entryRows.push(row)
            }
        }

        // PROCESS ACCOUNTS
        // Sort account rows by hierarchy depth (length of 'Account Name' split)
        // so parents are likely created before children.
        accountRows.sort((a, b) => {
            const nameA = a['Account Name'] || a['AccountName'] || ''
            const nameB = b['Account Name'] || b['AccountName'] || ''
            return nameA.split('::').length - nameB.split('::').length
        })

        // Re-fetch Map helpers since we might need them updated
        const nameToIdMap = new Map<string, string>()
        existingAccounts?.forEach(acc => nameToIdMap.set(acc.name, acc.id))

        // Also map Code to ID
        const codeToIdMap = new Map<string, string>()
        existingAccounts?.forEach(acc => codeToIdMap.set(acc.code, acc.id))

        let accountsCreated = 0
        for (const row of accountRows) {
            const code = String(row['Account Code'] || row['Code'] || row['AccountCode'])
            const fullName = String(row['Account Name'] || row['AccountName'])
            const rawType = String(row['Account Type'] || row['Type'] || row['AccountType'] || 'EXPENSE')
            // Normalization: "Cost of Goods Sold" -> "COST_OF_GOODS_SOLD", "Sales Income" -> "INCOME"
            let type = rawType.toUpperCase().replace(/\s+/g, '_')

            // Map common variants to canonical enums
            const typeMap: Record<string, string> = {
                'SALES_INCOME': 'INCOME',
                'OFFICE_EXPENSE': 'EXPENSE',
                'RENT_EXPENSE': 'EXPENSE',
                'CASH': 'BANK',
                'ACCOUNTS_RECEIVABLE': 'ACCOUNTS_RECEIVABLE',
                'ACCOUNTS_PAYABLE': 'ACCOUNTS_PAYABLE',
            }
            if (typeMap[type]) type = typeMap[type]

            const parts = fullName.split('::').map(s => s.trim())
            const localName = parts[parts.length - 1]
            const parentName = parts.length > 1 ? parts[parts.length - 2] : null

            // Find parent ID
            let parentId = null
            if (parentName) {
                // Look up parent by name
                // Note: limitation if multiple parents have same name. 
                // We rely on uniqueness or previous processing.
                parentId = nameToIdMap.get(parentName) || null
            }

            // Upsert Account
            // Check existence by Code
            let accId = codeToIdMap.get(code)

            if (accId) {
                // Update?
                // For now, let's just ensure it exists.
                // If parent changed, we might update.
                // await supabase.from('chart_of_accounts').update({ name: localName, parent_id: parentId, type }).eq('id', accId)
            } else {
                // Create
                const { data: newAcc, error: createError } = await supabase
                    .from('chart_of_accounts')
                    .insert({
                        user_id: user.id,
                        customer_id: customerId,
                        code,
                        name: localName,
                        type,
                        parent_id: parentId
                    })
                    .select('id')
                    .single()

                if (createError) {
                    console.error(`Error creating account ${code}:`, createError)
                } else {
                    accId = newAcc.id
                    codeToIdMap.set(code, newAcc.id)
                    accountsCreated++
                }
            }

            if (accId) {
                nameToIdMap.set(localName, accId) // Update map for children
            }
        }


        // PROCESS ENTRIES
        // Grouping Logic
        interface JournalLineInput {
            accountId: string
            debit: number
            credit: number
            description: string
        }
        interface JournalEntryInput {
            date: string
            description: string
            reference: string
            status: string
            lines: JournalLineInput[]
        }

        const entriesMap = new Map<string, JournalEntryInput>()

        for (const row of entryRows) {
            const date = String(row['Date'] || '')
            const entryDesc = String(row['Line Description'] || row['Line Desc'] || row['EntryDescription'] || '')
            const ref = String(row['Ref'] || row['Reference'] || '')

            const accountCode = String(row['Account Code'] || row['Code'] || row['AccountCode'] || '')
            const lineDesc = String(row['Item Description'] || row['Item Desc'] || row['LineDescription'] || '')

            const debit = Number(row['Debit'] || row['debit'] || 0)
            const credit = Number(row['Credit'] || row['credit'] || 0)
            let status = String(row['Status'] || row['status'] || 'DRAFT').toUpperCase()
            if (!['DRAFT', 'POSTED', 'ARCHIVED', 'VOID'].includes(status)) {
                status = 'DRAFT'
            }

            if (!accountCode) continue;

            const accountId = codeToIdMap.get(accountCode)
            if (!accountId) {
                throw new Error(`Account code '${accountCode}' not found. Please include an Account Definition row.`)
            }

            const groupKey = `${date}|${ref}|${entryDesc}`
            const existing = entriesMap.get(groupKey)

            if (existing) {
                existing.lines.push({ accountId, debit, credit, description: lineDesc })
                // If this row has a more specific status (like POSTED), update the group status
                if (status !== 'DRAFT' && existing.status === 'DRAFT') {
                    existing.status = status
                }
            } else {
                entriesMap.set(groupKey, {
                    date,
                    description: entryDesc,
                    reference: ref,
                    status,
                    lines: [{ accountId, debit, credit, description: lineDesc }]
                })
            }
        }

        const entries = Array.from(entriesMap.values())


        // 5. Insert Entries
        let count = 0
        for (const entry of entries) {
            // Validate balance
            const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0)
            const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0)

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                // Skip unbalanced?
                // throw new Error(`Entry '${entry.description}' is not balanced.`)
                console.warn(`Entry '${entry.description}' unbalanced. D:${totalDebit} C:${totalCredit}`)
            }

            const { data: newEntry, error: entryError } = await supabase
                .from('journal_entries')
                .insert({
                    user_id: user.id,
                    customer_id: customerId,
                    date: entry.date,
                    description: entry.description,
                    reference_number: entry.reference,
                    status: entry.status
                })
                .select()
                .single()

            if (entryError) throw new Error(`Failed to create entry: ${entryError.message}`)

            const linesToInsert = entry.lines.map(line => ({
                entry_id: newEntry.id,
                account_id: line.accountId,
                debit: line.debit,
                credit: line.credit,
                description: line.description
            }))

            const { error: linesError } = await supabase
                .from('journal_lines')
                .insert(linesToInsert)

            if (linesError) {
                await supabase.from('journal_entries').delete().eq('id', newEntry.id)
                throw new Error(`Failed to create lines: ${linesError.message}`)
            }

            count++
        }

        return NextResponse.json({
            success: true,
            journalEntriesCount: entries.length,
            accountsCreatedCount: accountsCreated
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
