import { useQuery } from '@tanstack/react-query'
import { useCustomer } from '@/components/providers/customer-provider'

export interface PLData {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    incomeItems: {
        id: string
        name: string
        code: string
        type: string
        amount: number
    }[]
    expenseItems: {
        id: string
        name: string
        code: string
        type: string
        amount: number
    }[]
}

async function fetchProfitAndLoss(from?: string, to?: string): Promise<PLData> {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const res = await fetch(`/api/reports/profit-and-loss?${params.toString()}`)
    if (!res.ok) {
        throw new Error('Failed to fetch P&L data')
    }
    return res.json()
}

export function useProfitAndLoss(from?: string, to?: string) {
    const { selectedCustomer } = useCustomer()

    return useQuery({
        queryKey: ['profit-and-loss', selectedCustomer?.id, from, to],
        queryFn: () => fetchProfitAndLoss(from, to),
        enabled: !!selectedCustomer?.id
    })
}
