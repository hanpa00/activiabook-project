import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Papa from 'papaparse'
import { processCsvWithAI } from '@/lib/openclaw'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const csvText = await file.text()

        // Parse CSV to get a sample for the AI
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        const sampleData = parsed.data.slice(0, 50) // Send first 50 rows to AI
        const sampleCsv = Papa.unparse(sampleData)

        // Fetch Chart of Accounts
        const { data: coa, error: coaError } = await supabase
            .from('chart_of_accounts')
            .select('id, name, type, code')
            .eq('customer_id', customerId)

        if (coaError) throw coaError

        // Call Gemini
        const aiResult = await processCsvWithAI(sampleCsv, coa || [])

        // Process entries and save to DB as DRAFT
        const createdEntries = []

        for (const aiEntry of aiResult.entries) {
            // 1. Create Journal Entry
            const { data: entry, error: entryError } = await supabase
                .from('journal_entries')
                .insert({
                    user_id: user.id,
                    customer_id: customerId,
                    date: aiEntry.date,
                    description: aiEntry.description,
                    status: 'DRAFT'
                })
                .select()
                .single()

            if (entryError) continue // Skip failed entries for now, or log them

            // 2. Create Journal Lines
            const lines = aiEntry.lines.map(line => {
                let accountId = line.account_id

                // Handle balancing required if AI couldn't find a match
                if (accountId === "BALANCING_REQUIRED" || !accountId) {
                    // You could look for a specific 'AI Balancing' account or use a generic one
                    // For now, let's try to find an 'AI Balancing Account' or fallback
                    const balancingAccount = coa?.find(a => a.name === "AI Balancing Account")
                    accountId = balancingAccount?.id || line.account_id
                }

                return {
                    entry_id: entry.id,
                    account_id: accountId,
                    description: line.line_description || aiEntry.description,
                    debit: line.debit,
                    credit: line.credit
                }
            })

            const { error: linesError } = await supabase
                .from('journal_lines')
                .insert(lines)

            if (linesError) {
                // Cleanup if lines fail
                await supabase.from('journal_entries').delete().eq('id', entry.id)
                continue
            }

            createdEntries.push(entry.id)
        }

        return NextResponse.json({
            success: true,
            count: createdEntries.length,
            message: `${createdEntries.length} draft entries created.`
        })

    } catch (error: any) {
        console.error('Import Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to process CSV' }, { status: 500 })
    }
}
