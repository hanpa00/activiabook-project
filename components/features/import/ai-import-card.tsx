"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useCustomer } from "@/components/providers/customer-provider"
import { useQueryClient } from "@tanstack/react-query"

export function AiImportCard() {
    const { selectedCustomer } = useCustomer()
    const queryClient = useQueryClient()
    const [importFile, setImportFile] = useState<File | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleAiImport = async () => {
        if (!importFile) {
            alert("Please select a file to import")
            return
        }
        if (!selectedCustomer) {
            alert("No customer selected.")
            return
        }

        setIsImporting(true)
        setResult(null)
        const formData = new FormData()
        formData.append('file', importFile)

        try {
            const response = await fetch('/api/import/csv', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Import failed')
            }

            const data = await response.json()
            setResult({ success: true, message: data.message })
            setImportFile(null)
            await queryClient.invalidateQueries()
        } catch (error: any) {
            console.error(error)
            setResult({ success: false, message: error.message })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI-Powered Import
                </CardTitle>
                <CardDescription>
                    Upload CSV statements. Gemini AI will identify data, balance entries, and create drafts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Statement File (CSV)</Label>
                    <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        disabled={isImporting}
                    />
                </div>

                {result && (
                    <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${result.success ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"
                        }`}>
                        {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {result.message}
                    </div>
                )}

                <Button
                    className="w-full"
                    onClick={handleAiImport}
                    disabled={isImporting || !importFile}
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            AI is processing...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Process with AI
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
