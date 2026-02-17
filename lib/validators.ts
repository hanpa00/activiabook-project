import { z } from 'zod'

export const journalLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
})

export const journalEntrySchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  reference_number: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least two lines are required"),
}).refine((data) => {
  const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0)
  return Math.abs(totalDebit - totalCredit) < 0.01
}, {
  message: "Total Debits must equal Total Credits",
  path: ["lines"],
})

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>
