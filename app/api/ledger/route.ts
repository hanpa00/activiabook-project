

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const start = (page - 1) * limit
    const end = start + limit - 1

    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let selectQuery = `
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
            `

        const accounts = searchParams.get('accounts')
        if (accounts) {
            selectQuery = `
                *,
                journal_lines!inner (
                    id,
                    description,
                    debit,
                    credit,
                    chart_of_accounts (
                        name
                    )
                )
            `
        }

        let query = supabase
            .from('journal_entries')
            .select(selectQuery, { count: 'exact' })
            .eq('user_id', user.id)
            .eq('customer_id', customerId)
            .order('date', { ascending: false })
            .range(start, end)

        const status = searchParams.get('status')
        if (status) query = query.eq('status', status)

        const fromDate = searchParams.get('from')
        if (fromDate) query = query.gte('date', fromDate)

        const toDate = searchParams.get('to')
        if (toDate) query = query.lte('date', toDate)

        const reference = searchParams.get('reference')
        if (reference) query = query.ilike('reference_number', `%${reference}%`)

        const search = searchParams.get('search')
        if (search) {
            // Search in entry reference or entry description
            query = query.or(`reference_number.ilike.%${search}%,description.ilike.%${search}%`)
        }

        if (accounts) {
            const accountIds = accounts.split(',')
            query = query.in('journal_lines.account_id', accountIds)
        }

        const { data, count, error } = await query
        if (error) throw error

        return NextResponse.json({ data, count })
    } catch (error) {
        console.error("Ledger API Error:", error)
        return NextResponse.json({ error: 'Failed to fetch ledger entries' }, { status: 500 })
    }
}

