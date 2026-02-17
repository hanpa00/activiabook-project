
"use client"

import * as React from "react"
import { CalendarIcon, X, Check, Search as SearchIcon, Filter } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useAccounts } from "@/hooks/use-accounts"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface LedgerFilters {
  dateRange: DateRange | undefined
  selectedAccounts: string[] // Account IDs
  status: string | undefined // 'DRAFT' | 'POSTED' | undefined (All)
  reference: string
  search: string
  searchMode: 'local' | 'global'
}

export interface LedgerToolbarProps {
  filters: LedgerFilters
  onFilterChange: (filters: LedgerFilters) => void
  suggestions?: string[]
  onManualSearch?: () => void
}

export function LedgerToolbar({ filters, onFilterChange, suggestions = [], onManualSearch }: LedgerToolbarProps) {
  const { data: accounts } = useAccounts()
  const [openAccountSelect, setOpenAccountSelect] = React.useState(false)

  // Status Handler
  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val === filters.status ? undefined : val }) // Toggle off
  }

  // Account Handler
  const toggleAccount = (accountId: string) => {
    const current = filters.selectedAccounts
    const next = current.includes(accountId)
      ? current.filter(id => id !== accountId)
      : [...current, accountId]
    onFilterChange({ ...filters, selectedAccounts: next })
  }

  // Date Handler
  const handleDateSelect = (range: DateRange | undefined) => {
    onFilterChange({ ...filters, dateRange: range })
  }

  const selectedAccountNames = filters.selectedAccounts.map(id => accounts?.find(a => a.id === id)?.name).filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative w-[300px]">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ref, desc, amt..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-8"
            list="search-suggestions"
          />
          <datalist id="search-suggestions">
            {suggestions.map((s, i) => (
              <option key={i} value={s} />
            ))}
          </datalist>
        </div>

        {/* Manual Search Button (Optional, for Global mode clarity) */}
        {filters.searchMode === 'global' && (
          <Button variant="ghost" size="icon" onClick={onManualSearch} title="Search now">
            <SearchIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Reference Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ref #"
            value={filters.reference}
            onChange={(e) => onFilterChange({ ...filters, reference: e.target.value })}
            className="w-[120px]"
          />
        </div>

        {/* Search Mode Toggle */}
        <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-md border">
          <Label className="text-xs px-2 text-muted-foreground">Search Mode:</Label>
          <Toggle
            pressed={filters.searchMode === 'global'}
            onPressedChange={(pressed) => onFilterChange({ ...filters, searchMode: pressed ? 'global' : 'local' })}
            size="sm"
            className="h-7 text-xs px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            GLOBAL
          </Toggle>
          <Toggle
            pressed={filters.searchMode === 'local'}
            onPressedChange={(pressed) => onFilterChange({ ...filters, searchMode: pressed ? 'local' : 'global' })}
            size="sm"
            className="h-7 text-xs px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            LOCAL
          </Toggle>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !filters.dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                    {format(filters.dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(filters.dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Date Range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Account Multi-Select */}
        <Popover open={openAccountSelect} onOpenChange={setOpenAccountSelect}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              {selectedAccountNames.length > 0
                ? `${selectedAccountNames.length} selected`
                : "Filter Account..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search account..." />
              <CommandList>
                <CommandEmpty>No account found.</CommandEmpty>
                <CommandGroup>
                  {accounts?.map((account) => (
                    <CommandItem
                      key={account.id}
                      value={account.name}
                      onSelect={() => toggleAccount(account.id)}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        filters.selectedAccounts.includes(account.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}>
                        <Check className="h-4 w-4" />
                      </div>
                      {account.code} - {account.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Status Toggle */}
        <div className="flex items-center border rounded-md p-1 bg-muted/20">
          <Button
            variant={filters.status === 'DRAFT' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleStatusChange('DRAFT')}
            className="h-7 text-xs"
          >
            Draft
          </Button>
          <Button
            variant={filters.status === 'POSTED' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleStatusChange('POSTED')}
            className="h-7 text-xs"
          >
            Posted
          </Button>
        </div>

        {/* Reset */}
        {(filters.dateRange || filters.selectedAccounts.length > 0 || filters.status || filters.reference || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange({ dateRange: undefined, selectedAccounts: [], status: undefined, reference: '', search: '', searchMode: filters.searchMode })}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
