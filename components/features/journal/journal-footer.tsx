'use client'

import { UseFormReturn, useWatch } from "react-hook-form"
import { Save, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { JournalEntryFormValues } from "@/lib/validators"
import { cn } from "@/lib/utils"

interface JournalFooterProps {
  form: UseFormReturn<JournalEntryFormValues>
  isSubmitting?: boolean
  onSave?: (status: 'DRAFT' | 'POSTED') => void
  onDelete?: () => void
  onClose?: () => void
  isPosted?: boolean
}

export function JournalFooter({ form, isSubmitting, onSave, onDelete, onClose, isPosted }: JournalFooterProps) {
  const router = useRouter()
  const lines = useWatch({
    control: form.control,
    name: "lines",
  })

  // ... (calculation logic remains same)
  // Calculate totals
  const totalDebit = lines?.reduce((sum, line) => sum + (Number(line.debit) || 0), 0) || 0
  const totalCredit = lines?.reduce((sum, line) => sum + (Number(line.credit) || 0), 0) || 0

  const difference = totalDebit - totalCredit
  const isBalanced = Math.abs(difference) < 0.01

  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-8 flex items-center justify-between border-t bg-background px-6 py-4 shadow-up-sm">
      <div className="flex gap-8 text-sm">
        {/* ... (totals display remains same) ... */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Debits</span>
          <span className="font-mono text-xl font-medium">${totalDebit.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Credits</span>
          <span className="font-mono text-xl font-medium">${totalCredit.toFixed(2)}</span>
        </div>
        {!isBalanced && (
          <div className="flex flex-col text-destructive">
            <span className="text-xs opacity-80 uppercase tracking-wider">Difference</span>
            <span className="font-mono text-xl font-medium">{difference > 0 ? `${difference.toFixed(2)} Dr` : `${Math.abs(difference).toFixed(2)} Cr`}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isBalanced && (
          <span className="text-sm font-medium text-destructive">
            Entry is out of balance
          </span>
        )}

        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={onDelete}
            className="mr-2"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Entry
          </Button>
        )}

        {!isPosted && (
          <Button
            type="button"
            variant="outline"
            disabled={!isBalanced || isSubmitting}
            onClick={() => onSave?.('DRAFT')}
            className="w-full sm:w-auto"
          >
            Save as Draft
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => onClose ? onClose() : router.push('/ledger')}
          className="w-full sm:w-auto"
        >
          <X className="mr-2 h-4 w-4" />
          {isPosted ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}
