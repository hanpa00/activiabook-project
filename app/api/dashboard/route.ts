import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const customerId = cookieStore.get('activiabook_customer_id')?.value

    if (!customerId) {
      return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()

    // 1. Calculate Cash on Hand 
    const { data: cashData, error: cashError } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        chart_of_accounts!inner (
          type,
          name,
          customer_id
        )
      `)
      .eq('chart_of_accounts.type', 'ASSET')
      .eq('chart_of_accounts.customer_id', customerId)
      .or('name.ilike.%Cash%,name.ilike.%Bank%', { foreignTable: 'chart_of_accounts' })

    if (cashError) throw cashError

    const totalCash = cashData.reduce((sum, line) => sum + (Number(line.debit) - Number(line.credit)), 0)

    // 2. Total Payables
    const { data: payablesData, error: payablesError } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        chart_of_accounts!inner (
          type,
          customer_id
        )
      `)
      .eq('chart_of_accounts.type', 'LIABILITY')
      .eq('chart_of_accounts.customer_id', customerId)

    if (payablesError) throw payablesError

    const totalPayables = payablesData.reduce((sum, line) => sum + (Number(line.credit) - Number(line.debit)), 0)

    // 3. Net Income (Current Month)
    const { data: incomeExpenseData, error: incomeError } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        chart_of_accounts!inner (
          type,
          customer_id
        ),
        journal_entries!inner (
            date,
            customer_id
        )
      `)
      .eq('journal_entries.customer_id', customerId)
      .gte('journal_entries.date', firstDayOfMonth)
      .in('chart_of_accounts.type', ['INCOME', 'EXPENSE'])

    if (incomeError) throw incomeError

    let netIncome = incomeExpenseData.reduce((sum, line) => sum + (Number(line.credit) - Number(line.debit)), 0)

    // 4. Chart Data (Last 6 Months)
    const { data: historyData, error: historyError } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        chart_of_accounts!inner (
          type,
          customer_id
        ),
        journal_entries!inner (
            date,
            customer_id
        )
      `)
      .eq('journal_entries.customer_id', customerId)
      .gte('journal_entries.date', sixMonthsAgo)
      .in('chart_of_accounts.type', ['INCOME', 'EXPENSE'])

    if (historyError) throw historyError

    const monthlyData: Record<string, { income: number, expense: number }> = {}

    historyData.forEach(line => {
      const date = new Date((line.journal_entries as any).date)
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 }

      const type = (line.chart_of_accounts as any).type
      if (type === 'INCOME') {
        monthlyData[monthKey].income += (Number(line.credit) - Number(line.debit))
      } else if (type === 'EXPENSE') {
        monthlyData[monthKey].expense += (Number(line.debit) - Number(line.credit))
      }
    })

    const chartData = Object.entries(monthlyData).map(([name, vals]) => ({
      name,
      Income: vals.income,
      Expense: vals.expense
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

    // 5. Recent Activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'POSTED')
      .order('date', { ascending: false })
      .limit(5)

    if (activityError) throw activityError

    return NextResponse.json({
      metrics: {
        cashOnHand: totalCash,
        netIncome,
        totalPayables
      },
      chartData,
      recentActivity
    })

  } catch (error: any) {
    console.error('Dashboard Error:', error)
    return NextResponse.json({
      metrics: { cashOnHand: 0, netIncome: 0, totalPayables: 0 },
      chartData: [],
      recentActivity: []
    })
  }
}
