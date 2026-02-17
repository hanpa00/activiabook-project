
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo, useEffect } from "react"
import { useAccounts } from "@/hooks/use-accounts"
import { buildAccountTree, flattenAccountTree, AccountNode } from "@/lib/account-utils"
import { ACCOUNT_TYPE_LABELS } from "@/lib/account-types"

const createAccountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(2, "Name is required"),
  type: z.enum([
    'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE',
    'BANK', 'ACCOUNTS_RECEIVABLE', 'OTHER_CURRENT_ASSET', 'FIXED_ASSET', 'OTHER_ASSET',
    'ACCOUNTS_PAYABLE', 'CREDIT_CARD', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY',
    'COST_OF_GOODS_SOLD', 'OTHER_INCOME', 'OTHER_EXPENSE'
  ]),
  parent_id: z.string().optional(),
})

type CreateAccountValues = z.infer<typeof createAccountSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated?: (id: string) => void
}

export function CreateAccountDialog({ open, onOpenChange, onAccountCreated }: Props) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const { data: accounts } = useAccounts()

  const form = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "EXPENSE",
      parent_id: undefined,
    },
  })

  // Watch parent_id to auto-set type
  const parentId = form.watch("parent_id")
  
  useEffect(() => {
    if (parentId && accounts) {
      const parent = accounts.find(a => a.id === parentId)
      if (parent) {
        // @ts-ignore - we know parent.type is valid because we sync types now
        form.setValue("type", parent.type)
      }
    }
  }, [parentId, accounts, form])

  const mutation = useMutation({
    mutationFn: async (values: CreateAccountValues) => {
      const payload = {
        ...values,
        parent_id: values.parent_id === "none" || !values.parent_id ? null : values.parent_id
      }
      
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create account')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      form.reset()
      onOpenChange(false)
      setError(null)
      if (onAccountCreated) {
        onAccountCreated(data.id)
      }
    },
    onError: (err) => {
        setError(err.message)
    }
  })

  function onSubmit(values: CreateAccountValues) {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Add a new account to your Chart of Accounts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {error && <div className="text-red-500 text-sm">{error}</div>}
             
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Account (Optional)</FormLabel>
                   <Select 
                      onValueChange={field.onChange} 
                      value={field.value || "none"}
                    >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Office Supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!!parentId && parentId !== "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentId && parentId !== "none" && <p className="text-xs text-muted-foreground">Inherited from parent</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
