
import { useQuery } from '@tanstack/react-query'
import { useCustomer } from '@/components/providers/customer-provider'

async function fetchDashboardData() {
  const res = await fetch('/api/dashboard')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export function useDashboardData() {
  const { selectedCustomer } = useCustomer()

  return useQuery({
    queryKey: ['dashboard', selectedCustomer?.id],
    queryFn: fetchDashboardData,
    enabled: !!selectedCustomer?.id
  })
}
