import { useQuery } from "@tanstack/react-query"
import { ChartOfAccount } from "@/types"
import { useCustomer } from "@/components/providers/customer-provider"

async function fetchAccounts() {
  const res = await fetch('/api/accounts')
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json() as Promise<ChartOfAccount[]>
}

export function useAccounts() {
  const { selectedCustomer } = useCustomer()

  return useQuery({
    queryKey: ["accounts", selectedCustomer?.id],
    queryFn: fetchAccounts,
    enabled: !!selectedCustomer?.id
  })
}
