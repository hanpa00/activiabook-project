
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAccountCategory } from '@/lib/account-types'
import { AccountType } from '@/types'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const supabase = await createClient()
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!customerId) {
            return NextResponse.json({ error: 'Customer selection required' }, { status: 400 })
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: accounts, error: accountsError } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('customer_id', customerId)
            .order('code', { ascending: true })

        if (accountsError) throw accountsError

        // 2. Fetch Posted Journal Lines
        const { data: lines, error: linesError } = await supabase
            .from('journal_lines')
            .select(`
        account_id,
        debit,
        credit,
        journal_entries!inner (
            status
        )
      `)
            .eq('journal_entries.status', 'POSTED')
            .eq('journal_entries.user_id', user.id)
            .eq('journal_entries.customer_id', customerId)

        if (linesError) throw linesError

        // Aggregate Balances...
        const balances: Record<string, number> = {}
        lines.forEach((line: any) => {
            const id = line.account_id
            const debit = Number(line.debit) || 0
            const credit = Number(line.credit) || 0
            if (!balances[id]) balances[id] = 0
            balances[id] += (debit - credit)
        })

        const accountsWithBalance = accounts.map(account => {
            let netDebit = balances[account.id] || 0
            let balance = 0
            const category = getAccountCategory(account.type as AccountType)

            switch (category) {
                case 'ASSET':
                case 'EXPENSE':
                    balance = netDebit
                    break
                case 'LIABILITY':
                case 'EQUITY':
                case 'INCOME':
                    balance = -netDebit
                    break
                default:
                    balance = netDebit
            }

            return { ...account, balance }
        })

        return NextResponse.json(accountsWithBalance)
    } catch (error) {
        console.error("Accounts API Error:", error)
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
}

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

        // Quota Check
        const { data: quota } = await supabase.from('user_quotas').select('max_accounts').eq('user_id', user.id).single()
        if (quota && quota.max_accounts !== -1) {
            const { count } = await supabase
                .from('chart_of_accounts')
                .select('*', { count: 'exact', head: true })
                .eq('customer_id', customerId)

            if (count !== null && count >= quota.max_accounts) {
                return NextResponse.json({ error: 'Account quota exceeded' }, { status: 403 })
            }
        }

        const body = await req.json()
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .insert({ ...body, user_id: user.id, customer_id: customerId })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error("Create Account Error:", error)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!id || !customerId) {
            return NextResponse.json({ error: 'ID and Customer ID required' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabase
            .from('chart_of_accounts')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Delete Account Error:", error)
        if (error.code === '23503') {
            return NextResponse.json({ error: 'Cannot delete account with existing transactions.' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const body = await req.json()
        const { id, name, code, parent_id, type } = body
        const cookieStore = await cookies()
        const customerId = cookieStore.get('activiabook_customer_id')?.value

        if (!id || !customerId) {
            return NextResponse.json({ error: 'ID and Customer ID are required' }, { status: 400 })
        }

        // Circular dependency check (basic)
        if (parent_id === id) {
            return NextResponse.json({ error: 'An account cannot be its own parent' }, { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const updateData: any = {}
        if (name) updateData.name = name
        if (code) updateData.code = code
        if (type) updateData.type = type
        if (parent_id !== undefined) {
            updateData.parent_id = (parent_id === "none" || !parent_id) ? null : parent_id
        }

        const { data, error } = await supabase
            .from('chart_of_accounts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('customer_id', customerId)
            .select()
            .single()

        if (error) throw error

        // If type changed, cascade to descendants
        if (type) {
            // 1. Fetch all accounts for this customer to find descendants in memory
            const { data: allAccounts } = await supabase
                .from('chart_of_accounts')
                .select('id, parent_id')
                .eq('customer_id', customerId)

            if (allAccounts) {
                const descendants: string[] = []
                const findDescendants = (parentId: string) => {
                    const children = allAccounts.filter(a => a.parent_id === parentId)
                    children.forEach(child => {
                        descendants.push(child.id)
                        findDescendants(child.id)
                    })
                }
                findDescendants(id)

                if (descendants.length > 0) {
                    await supabase
                        .from('chart_of_accounts')
                        .update({ type })
                        .in('id', descendants)
                        .eq('user_id', user.id)
                }
            }
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error("Update Account Error:", error)
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
    }
}

