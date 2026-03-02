
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    const apiKey = req.headers.get('x-integration-key')

    if (apiKey !== process.env.OPENCLAW_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { action, user_email, ...params } = body

        if (!user_email) {
            return NextResponse.json({ error: 'User email is required' }, { status: 400 })
        }

        const supabaseAdmin = await createAdminClient()

        // Find user by email to get user_id
        // We can't use auth.getUser() because we are admin. 
        // We need to query the users table or use admin auth methods if available.
        // Actually, createAdminClient uses service_role key, so we can list users.
        const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()

        if (userError) throw userError

        const user = users.find(u => u.email === user_email)

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Logic to emulate user context. 
        // We can use the admin client to query data as if we are the user, 
        // but we must manually enforce RLS or filter by user_id.
        // Since we are using service role, RLS is bypassed. MUST FILTER BY USER_ID explicitly.

        switch (action) {
            case 'list_customers': {
                const { data, error } = await supabaseAdmin
                    .from('customers')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name')

                if (error) throw error
                return NextResponse.json(data)
            }

            case 'get_ledger': {
                const { customer_id, limit = 10 } = params
                if (!customer_id) {
                    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
                }

                const { data, error } = await supabaseAdmin
                    .from('journal_entries')
                    .select(`
                        *,
                        journal_lines (
                            id,
                            description,
                            debit,
                            credit,
                            chart_of_accounts (
                                name
                            )
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('customer_id', customer_id) // Ensure we only get data for the correct customer
                    .order('date', { ascending: false })
                    .limit(limit)

                if (error) throw error
                return NextResponse.json(data)
            }

            case 'create_entry': {
                const { customer_id, entry } = params
                if (!customer_id || !entry || !entry.lines || entry.lines.length < 2) {
                    return NextResponse.json({ error: 'Invalid entry data' }, { status: 400 })
                }

                // Verify params
                if (entry.lines.reduce((acc: number, line: any) => acc + (line.debit || 0) - (line.credit || 0), 0) !== 0) {
                    return NextResponse.json({ error: 'Entry is not balanced' }, { status: 400 })
                }

                // 1. Create Entry
                const { data: newEntry, error: entryError } = await supabaseAdmin
                    .from('journal_entries')
                    .insert({
                        user_id: user.id,
                        customer_id,
                        date: entry.date,
                        description: entry.description,
                        status: 'Draft',
                        reference_number: entry.reference_number
                    })
                    .select()
                    .single()

                if (entryError) throw entryError

                // 2. Create Lines
                const linesToInsert = entry.lines.map((line: any) => ({
                    journal_entry_id: newEntry.id,
                    account_id: line.account_id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    description: line.line_description || entry.description
                }))

                const { error: linesError } = await supabaseAdmin
                    .from('journal_lines')
                    .insert(linesToInsert)

                if (linesError) {
                    // Ideally we should rollback here, but Supabase HTTP API doesn't support transactions easily without RPC.
                    // For now, return error.
                    return NextResponse.json({ error: 'Failed to create lines', details: linesError }, { status: 500 })
                }

                return NextResponse.json({ success: true, entry: newEntry })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

    } catch (error: any) {
        console.error('OpenClaw Integration Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
