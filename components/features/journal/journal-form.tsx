'use client'

import { useForm } from "react-hook-form"
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useRouter } from "next/navigation"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { journalEntrySchema, JournalEntryFormValues } from "@/lib/validators"
import { JournalFooter } from "./journal-footer"
import { JournalGrid } from "./journal-grid"
import { useState, forwardRef, useImperativeHandle } from "react"
import { CreateAccountDialog } from "@/components/features/accounts/create-account-dialog"

interface JournalFormProps {
  defaultValues?: any
  onSubmit?: (data: any) => Promise<void>
  readOnly?: boolean
  onDelete?: () => void
  onClose?: () => void
  isPosted?: boolean
}

export interface JournalFormHandle {
  submitWithStatus: (status: 'DRAFT' | 'POSTED') => Promise<void>
}


export const JournalForm = forwardRef<JournalFormHandle, JournalFormProps>(({ defaultValues, onSubmit: externalSubmit, readOnly, onDelete, onClose, isPosted }, ref) => {
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false)
  const [creatingLineIndex, setCreatingLineIndex] = useState<number | null>(null)

  const form = useForm<any>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: defaultValues || {
      lines: [
        { accountId: "", description: "", debit: 0, credit: 0 },
        { accountId: "", description: "", debit: 0, credit: 0 },
      ],
      date: new Date(),
      reference_number: "",
    },
    mode: "onChange",
    disabled: readOnly
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  // Auto-populate description on date change if description is empty or default
  const watchedDate = form.watch('date')
  const watchedDescription = form.watch('description')

  useEffect(() => {
    if (watchedDate && (!watchedDescription || watchedDescription.startsWith('Journal Entry'))) {
      const formattedDate = format(watchedDate, 'yyyy-MM-dd')
      form.setValue('description', `Journal Entry ${formattedDate}`)
    }
  }, [watchedDate, form, watchedDescription])

  const router = useRouter()
  const queryClient = useQueryClient()

  async function onSubmit(data: any, status: 'DRAFT' | 'POSTED' = 'DRAFT') {
    if (externalSubmit) {
      await externalSubmit({ ...data, status })
      return
    }

    try {
      const payload = {
        ...data,
        status,
        date: format(data.date, 'yyyy-MM-dd')
      }

      const response = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error(error)
        alert('Failed to save entry')
        return
      }

      const result = await response.json()
      console.log("Saved:", result)

      form.reset()

      await Promise.all([
        queryClient.resetQueries({ queryKey: ['ledger'] }),
        queryClient.resetQueries({ queryKey: ['dashboard'] }),
        queryClient.resetQueries({ queryKey: ['journal'] })
      ])
      router.push("/ledger")

    } catch (error) {
      console.error(error)
    }
  }

  useImperativeHandle(ref, () => ({
    submitWithStatus: async (status: 'DRAFT' | 'POSTED') => {
      await form.handleSubmit((data) => onSubmit(data, status))()
    }
  }))
  return (
    <Form {...form}>
      <form className="space-y-8">
        {/* ... (fields) ... */}
        <div className="grid gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ref #</FormLabel>
                <FormControl>
                  <Input placeholder="Reference #" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Transaction description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <JournalGrid
          form={form}
          onCreateAccount={(index) => {
            setCreatingLineIndex(index)
            setIsCreateAccountOpen(true)
          }}
        />
        <JournalFooter
          form={form}
          onSave={(status) => {
            form.handleSubmit((data) => onSubmit(data, status))()
          }}
          onDelete={onDelete}
          onClose={onClose}
          isPosted={isPosted}
        />
      </form>
      <CreateAccountDialog
        open={isCreateAccountOpen}
        onOpenChange={(open) => {
          setIsCreateAccountOpen(open)
          if (!open) setCreatingLineIndex(null)
        }}
        onAccountCreated={(id) => {
          if (creatingLineIndex !== null) {
            form.setValue(`lines.${creatingLineIndex}.accountId`, id)
          }
        }}
      />
    </Form>
  )
})
JournalForm.displayName = "JournalForm"
