"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Download, Upload, RefreshCw, FileText, FileSpreadsheet, FileJson } from "lucide-react"
import { useCustomer } from "@/components/providers/customer-provider"
import { useQueryClient } from "@tanstack/react-query"
import { AiImportCard } from "@/components/features/import/ai-import-card"

export default function ToolsPage() {
    const { selectedCustomer } = useCustomer()
    const queryClient = useQueryClient()
    const [exportFormat, setExportFormat] = useState("csv")
    const [exportFilename, setExportFilename] = useState("")
    const [importFormat, setImportFormat] = useState("csv")
    const [importFile, setImportFile] = useState<File | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isRecalculating, setIsRecalculating] = useState(false)

    const handleExport = async () => {
        if (!selectedCustomer) {
            alert("No customer selected.")
            return
        }
        setIsExporting(true)
        try {
            const query = new URLSearchParams({
                format: exportFormat,
                filename: exportFilename,
                customerId: selectedCustomer.id
            })
            const response = await fetch(`/api/tools/export?${query.toString()}`, {
                method: 'POST',
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${exportFilename || 'journal_entries'}.${exportFormat}`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            alert("Export failed. Please try again.")
        } finally {
            setIsExporting(false)
        }
    }

    const handleImport = async () => {
        if (!importFile) {
            alert("Please select a file to import")
            return
        }
        if (!selectedCustomer) {
            alert("No customer selected.")
            return
        }

        setIsImporting(true)
        const formData = new FormData()
        formData.append('file', importFile)
        formData.append('format', importFormat)
        formData.append('customerId', selectedCustomer.id)

        try {
            const response = await fetch('/api/tools/import', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Import failed')
            }

            const result = await response.json()
            alert(`Import successful! ${result.journalEntriesCount} journal entries and ${result.accountsCreatedCount} new accounts processed.`)
            setImportFile(null)
            await queryClient.invalidateQueries()
            // Reset file input value manually if needed
        } catch (error: any) {
            console.error(error)
            alert(`Import failed: ${error.message}`)
        } finally {
            setIsImporting(false)
        }
    }

    const handleRecalculate = async () => {
        if (!selectedCustomer) {
            alert("No customer selected.")
            return
        }
        setIsRecalculating(true)
        try {
            const response = await fetch('/api/tools/recalculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customerId: selectedCustomer.id }),
            })
            if (!response.ok) throw new Error('Recalculation failed')

            await queryClient.invalidateQueries()
            alert("Balances recalculated and dashboards refreshed!")
        } catch (error) {
            console.error(error)
            alert("Recalculation failed.")
        } finally {
            setIsRecalculating(false)
        }
    }

    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Tools
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage your data and system maintenance.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AI Import Card */}
                <AiImportCard />

                {/* Export Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Export Data
                        </CardTitle>
                        <CardDescription>Download your journal entries.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Format</Label>
                            <Select value={exportFormat} onValueChange={setExportFormat}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="xls">Excel (XLS)</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Filename (Optional)</Label>
                            <Input
                                placeholder="journal_entries"
                                value={exportFilename}
                                onChange={(e) => setExportFilename(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? "Exporting..." : "Export"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Import Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Import Data
                        </CardTitle>
                        <CardDescription>Upload journal entries to the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Format</Label>
                            <Select value={importFormat} onValueChange={setImportFormat}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="csv">CSV</SelectItem>
                                    <SelectItem value="xls">Excel (XLS)</SelectItem>
                                    {/* PDF import is hard to implement reliably for structured data, usually OCR or complex parsing. 
                                        I'll include it in the UI but backend might reject or I'll implement a basic text parser if user insists.
                                        For now I will stick to the plan.
                                    */}
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>File</Label>
                            <Input
                                type="file"
                                accept={importFormat === 'csv' ? '.csv' : importFormat === 'xls' ? '.xls,.xlsx' : '.pdf'}
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleImport}
                            disabled={isImporting}
                        >
                            {isImporting ? "Importing..." : "Import"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Maintenance Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Maintenance
                        </CardTitle>
                        <CardDescription>System calculations and updates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                            This will force a recalculation of all account balances and dashboard metrics.
                            Use this if you notice any discrepancies.
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleRecalculate}
                            disabled={isRecalculating}
                        >
                            {isRecalculating ? "Recalculating..." : "Recalculate Balances"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
