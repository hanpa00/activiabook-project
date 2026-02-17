
"use client"

import * as React from "react"
import { useJournal } from "@/hooks/use-journal"
import { Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { JournalForm, JournalFormHandle } from "@/components/features/journal/journal-form"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Save, Trash2 } from "lucide-react"

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params)
    const { data: journal, isLoading, error } = useJournal(id)
    const router = useRouter()
    const queryClient = useQueryClient()
    const formRef = React.useRef<JournalFormHandle>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    if (error) return <div className="p-8 text-red-500">Error loading journal</div>

    // Transform API data to Form values
    const defaultValues = {
        description: journal.description,
        // Fix timezone issue by ensuring explicit date object from YYYY-MM-DD
        date: new Date(journal.date.includes('T') ? journal.date : `${journal.date}T12:00:00`),
        reference_number: journal.reference_number,
        lines: journal.journal_lines.map((line: any) => ({
            accountId: line.account_id,
            description: line.description,
            debit: line.debit,
            credit: line.credit
        }))
    }

    const isPosted = journal.status === 'POSTED'

    const handlePost = async () => {
        if (formRef.current) {
            await formRef.current.submitWithStatus('POSTED')
        }
    }

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/journals/${id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Failed to delete')

            await Promise.all([
                queryClient.resetQueries({ queryKey: ['ledger'] }),
                queryClient.resetQueries({ queryKey: ['dashboard'] }),
                queryClient.resetQueries({ queryKey: ['journal'] }),
                queryClient.resetQueries({ queryKey: ['profit-and-loss'] })
            ])

            router.push('/ledger')
            router.refresh()
        } catch (e) {
            alert('Failed to delete entry')
        }
    }


    const handleSave = async (data: any) => {
        try {
            // Format date as YYYY-MM-DD to avoid timezone issues
            const formattedData = {
                ...data,
                date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date
            }

            const res = await fetch(`/api/journals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formattedData)
            })
            if (!res.ok) throw new Error('Failed to update')

            await Promise.all([
                queryClient.resetQueries({ queryKey: ['ledger'] }),
                queryClient.resetQueries({ queryKey: ['dashboard'] }),
                queryClient.resetQueries({ queryKey: ['journal'] }),
                queryClient.resetQueries({ queryKey: ['profit-and-loss'] })
            ])

            // Redirect to Ledger on success
            router.push('/ledger')
            router.refresh()
        } catch (e) {

            console.error(e)
            // alert('Failed to save changes')

        }
    }

    return (
        <div className={`container mx-auto p-8`}>
            <div className="pb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">
                        {isPosted ? `Viewing Posted Entry (${journal.reference_number || 'No Ref'})` : 'Edit Draft Entry'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {!isPosted && (
                        <Button
                            onClick={handlePost}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Post Entry
                        </Button>
                    )}
                </div>
            </div>

            <div>
                <JournalForm
                    ref={formRef}
                    key={JSON.stringify(defaultValues)}
                    defaultValues={defaultValues}
                    onSubmit={handleSave}
                    readOnly={isPosted}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onClose={() => router.push('/ledger')}
                    isPosted={isPosted}
                />
            </div>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Journal Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this entry? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
