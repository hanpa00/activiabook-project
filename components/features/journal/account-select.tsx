'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAccounts } from "@/hooks/use-accounts"
import { buildAccountTree, flattenAccountTree } from "@/lib/account-utils"

interface AccountSelectProps {
  value?: string
  onSelect: (value: string) => void
  disabled?: boolean
  onCreateAccount?: () => void
}

export function AccountSelect({ value, onSelect, disabled, onCreateAccount }: AccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { data: accounts, isLoading } = useAccounts()

  const selectedAccount = accounts?.find((account) => account.id === value)

  const accountOptions = React.useMemo(() => {
    if (!accounts) return []
    const tree = buildAccountTree(accounts)
    return flattenAccountTree(tree)
  }, [accounts])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {value
            ? selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "Account not found"
            : "Select account..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search account..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {accountOptions.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  onSelect={() => {
                    onSelect(account.id)
                    setOpen(false)
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {/* Indentation based on level */}
                  <span style={{ paddingLeft: `${account.level * 16}px` }}>
                    {account.code} - {account.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateAccount && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onCreateAccount()
                      setOpen(false)
                    }}
                    className="cursor-pointer text-blue-600 focus:text-blue-600 font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new account...
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
