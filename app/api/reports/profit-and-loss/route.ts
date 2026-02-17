import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let query = supabase
            .from('journal_lines')
            .select(`
                id,
                debit,
                credit,
                chart_of_accounts!inner (
                    id,
                    name,
                    code,
                    type,
                    customer_id
                ),
                journal_entries!inner (
                    date,
                    status,
                    user_id,
                    customer_id
                )
            `)
            .eq('journal_entries.user_id', user.id)
            .eq('journal_entries.customer_id', customerId)
            .eq('journal_entries.status', 'POSTED')
            .in('chart_of_accounts.type', ['INCOME', 'EXPENSE'])

        if (from) query = query.gte('journal_entries.date', from)
        if (to) query = query.lte('journal_entries.date', to)

        const { data, error } = await query
        if (error) throw error

        const breakdown: Record<string, { id: string, name: string, code: string, type: string, amount: number }> = {}
        let totalRevenue = 0
        let totalExpenses = 0

        data.forEach((line: any) => {
            const account = line.chart_of_accounts
            const type = account.type

            const amount = type === 'INCOME'
                ? Number(line.credit) - Number(line.debit)
                : Number(line.debit) - Number(line.credit)

            if (!breakdown[account.id]) {
                breakdown[account.id] = {
                    id: account.id,
                    name: account.name,
                    code: account.code,
                    type: type,
                    amount: 0
                }
            }

            breakdown[account.id].amount += amount

            if (type === 'INCOME') {
                totalRevenue += amount
            } else {
                totalExpenses += amount
            }
        })

        const incomeItems = Object.values(breakdown).filter(item => item.type === 'INCOME')
        const expenseItems = Object.values(breakdown).filter(item => item.type === 'EXPENSE')
        const netProfit = totalRevenue - totalExpenses

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            netProfit,
            incomeItems,
            expenseItems
        })

    } catch (error: any) {
        console.error('P&L Error:', error)
        return NextResponse.json({ error: 'Failed to calculate P&L' }, { status: 500 })
    }
}
