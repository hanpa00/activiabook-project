
"use client"

import { cn } from "@/lib/utils"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, FileText, PlusCircle, ArrowUpDown, ArrowUp, ArrowDown, Search as SearchIcon } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCustomer } from "@/components/providers/customer-provider"

import { LedgerToolbar, LedgerFilters } from "@/components/features/ledger/ledger-toolbar"

async function fetchLedger(page: number, filters: LedgerFilters) {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', '50')

  if (filters.status) params.set('status', filters.status)
  if (filters.selectedAccounts.length > 0) params.set('accounts', filters.selectedAccounts.join(','))
  if (filters.dateRange?.from) params.set('from', filters.dateRange.from.toISOString())
  if (filters.dateRange?.to) params.set('to', filters.dateRange.to.toISOString())
  if (filters.reference) params.set('reference', filters.reference)
  if (filters.search) params.set('search', filters.search)

  const res = await fetch(`/api/ledger?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch ledger')
  return res.json()
}

export default function LedgerPage() {
  const { selectedCustomer } = useCustomer()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LedgerFilters>({
    dateRange: undefined,
    selectedAccounts: [],
    status: undefined,
    reference: '',
    search: '',
    searchMode: 'local'
  })
  // Local state for inputs to prevent immediate re-fetching via queryKey
  const [searchInput, setSearchInput] = useState('')
  const [referenceInput, setReferenceInput] = useState('')

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' })
  const router = useRouter()

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['ledger', selectedCustomer?.id, page, filters],
    queryFn: () => fetchLedger(page, filters),
    enabled: !!selectedCustomer?.id,
    placeholderData: keepPreviousData
  })

  const flatRows = useMemo(() => {
    let rows = data?.data?.flatMap((entry: any) => {
      return entry.journal_lines.map((line: any) => ({
        entry_id: entry.id,
        date: entry.date,
        reference: entry.reference_number,
        description: entry.description,
        account_name: line.chart_of_accounts?.name,
        debit: line.debit,
        credit: line.credit,
        status: entry.status
      }))
    }) || []

    // Local Filtering
    if (filters.searchMode === 'local') {
      if (filters.reference) {
        rows = rows.filter((r: any) => r.reference?.toLowerCase().includes(filters.reference.toLowerCase()))
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        rows = rows.filter((r: any) =>
          r.reference?.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower) ||
          r.debit?.toString().includes(searchLower) ||
          r.credit?.toString().includes(searchLower)
        )
      }
    }

    // Sorting (Always local for the current set of data, but Global mode should ideally handle it via API too)
    if (sortConfig) {
      rows.sort((a: any, b: any) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : 1
        } else {
          return aValue > bValue ? -1 : 1
        }
      })
    }

    return rows
  }, [data, filters.searchMode, filters.reference, filters.search, sortConfig])

  // Simple suggestions logic
  useMemo(() => {
    if (!filters.search || filters.search.length < 2) {
      setSuggestions([])
      return
    }
    const s = new Set<string>()
    const searchLower = filters.search.toLowerCase()
    flatRows.forEach((r: any) => {
      if (r.reference?.toLowerCase().includes(searchLower)) s.add(r.reference)
      if (r.description?.toLowerCase().includes(searchLower)) s.add(r.description)
      if (r.account_name?.toLowerCase().includes(searchLower)) s.add(r.account_name)
    })
    setSuggestions(Array.from(s).slice(0, 10))
  }, [filters.search, flatRows])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  // Handle Input Debouncing for Global Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, reference: referenceInput }))
      setPage(1)
    }, 500) // 500ms debounce
    return () => clearTimeout(timer)
  }, [searchInput, referenceInput])

  // Sync inputs when filters change (e.g. on Reset)
  useEffect(() => {
    setSearchInput(filters.search)
    setReferenceInput(filters.reference)
  }, [filters.search, filters.reference])

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-primary" /> : <ArrowDown className="ml-2 h-4 w-4 text-primary" />
  }

  if (error) return <div className="p-8 text-red-500">Error loading ledger</div>
  if (!selectedCustomer) return <div className="flex h-screen items-center justify-center text-muted-foreground">Please select a customer account.</div>

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
          <Button onClick={() => router.push('/journals/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
        <LedgerToolbar
          filters={{ ...filters, search: searchInput, reference: referenceInput }}
          onFilterChange={(f) => {
            // We update the local inputs immediately for responsiveness
            setSearchInput(f.search)
            setReferenceInput(f.reference)
            // For other filters (status, date, accounts), we update the main filters immediately
            if (f.status !== filters.status || f.dateRange !== filters.dateRange || f.selectedAccounts !== filters.selectedAccounts || f.searchMode !== filters.searchMode) {
              setFilters(f)
              setPage(1)
            }
          }}
          suggestions={suggestions}
          onManualSearch={() => {
            setFilters(prev => ({ ...prev, search: searchInput, reference: referenceInput }))
            setPage(1)
          }}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center">Date <SortIcon column="date" /></div>
              </TableHead>
              <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('reference')}>
                <div className="flex items-center">Ref # <SortIcon column="reference" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('description')}>
                <div className="flex items-center">Description <SortIcon column="description" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('account_name')}>
                <div className="flex items-center">Account <SortIcon column="account_name" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('debit')}>
                <div className="flex items-center justify-end">Debit <SortIcon column="debit" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('credit')}>
                <div className="flex items-center justify-end">Credit <SortIcon column="credit" /></div>
              </TableHead>
              <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status <SortIcon column="status" /></div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading transactions...
                  </div>
                </TableCell>
              </TableRow>
            ) : flatRows.map((row: any, i: number) => (
              <TableRow
                key={`${row.entry_id}-${i}`}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 h-8",
                  isFetching && "opacity-50 grayscale transition-opacity"
                )}
                onClick={() => router.push(`/journals/${row.entry_id}`)}
              >
                <TableCell className="py-1">{new Date(row.date + 'T00:00:00').toLocaleDateString()}</TableCell>
                <TableCell className="py-1">{row.reference || '-'}</TableCell>
                <TableCell className="py-1 max-w-[200px] truncate" title={row.description}>{row.description}</TableCell>
                <TableCell className="py-1">{row.account_name}</TableCell>
                <TableCell className="text-right py-1">{row.debit > 0 ? row.debit : ''}</TableCell>
                <TableCell className="text-right py-1">{row.credit > 0 ? row.credit : ''}</TableCell>
                <TableCell className="py-1">
                  <Badge variant={row.status === 'POSTED' ? 'secondary' : 'outline'}>{row.status}</Badge>
                </TableCell>
                <TableCell className="py-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
            {flatRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={flatRows.length < 50}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
