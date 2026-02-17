'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface LegalDocumentProps {
    title: string
    url: string
    triggerText: string
}

export function LegalDocument({ title, url, triggerText }: LegalDocumentProps) {
    const [content, setContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!open) return

        const fetchContent = async () => {
            setLoading(true)
            try {
                const response = await fetch(url)
                if (!response.ok) throw new Error('Failed to load document')
                const text = await response.text()
                setContent(text)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }
        fetchContent()
    }, [url, open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button type="button" className="text-indigo-600 hover:text-indigo-500 font-semibold underline underline-offset-4">
                    {triggerText}
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden min-h-0">
                    <ScrollArea className="h-full w-full p-4 border rounded-md bg-gray-50 dark:bg-slate-900">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span className="text-muted-foreground">Loading {title}...</span>
                            </div>
                        ) : error ? (
                            <div className="p-4 text-destructive bg-destructive/10 rounded border border-destructive/20">{error}</div>
                        ) : (
                            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                                {content}
                            </pre>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
}
