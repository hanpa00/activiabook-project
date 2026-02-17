
import { useQuery } from '@tanstack/react-query'
import { useCustomer } from '@/components/providers/customer-provider'

async function fetchJournal(id: string) {
  const res = await fetch(`/api/journals/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch journal')
  return res.json()
}

export function useJournal(id: string) {
  const { selectedCustomer } = useCustomer()

  return useQuery({
    queryKey: ['journal', selectedCustomer?.id, id],
    queryFn: () => fetchJournal(id),
    enabled: !!id && !!selectedCustomer?.id,
    refetchOnMount: 'always'
  })
}
