
import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { stringify } from "csv-stringify/sync"
import * as XLSX from "xlsx"
import PDFDocument from "pdfkit"

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const url = new URL(req.url)
    const format = url.searchParams.get('format') || 'csv'
    const filename = url.searchParams.get('filename') || 'journal_entries'
    const customerId = url.searchParams.get('customerId')

    if (!customerId) {
        return NextResponse.json({ error: "Customer ID is required" }, { status: 400 })
    }

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // 2. Fetch Data
        // A. Fetch All Accounts for Hierarchy
        const { data: accounts, error: accountsError } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('customer_id', customerId)

        if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 })

        // Build Map for Hierarchy
        const accountMap = new Map<string, any>()
        accounts?.forEach(acc => accountMap.set(acc.id, acc))

        const getHierarchicalName = (acc: any): string => {
            if (!acc.parent_id) return acc.name
            const parent = accountMap.get(acc.parent_id)
            if (!parent) return acc.name // Should not happen if data consistent
            return `${getHierarchicalName(parent)}::${acc.name}`
        }

        // B. Fetch Journal Entries
        const { data: entries, error } = await supabase
            .from('journal_entries')
            .select(`
                date,
                description,
                reference_number,
                status,
                journal_lines (
                    debit,
                    credit,
                    description,
                    chart_of_accounts (
                        id,
                        code,
                        name,
                        type,
                        parent_id
                    )
                )
            `)
            .eq('customer_id', customerId)
            .order('date', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 3. Transform Data
        const rows = []

        // A. Account Definition Rows
        const today = new Date().toISOString().split('T')[0]

        for (const acc of accounts || []) {
            rows.push({
                'Date': today,
                'Line Description': '',
                'Item Description': '',
                'Ref': '',
                'Account Code': acc.code,
                'Account Name': getHierarchicalName(acc),
                'Account Type': acc.type,
                'Status': '',
                'Debit': '',
                'Credit': ''
            })
        }

        // B. Entry Rows
        for (const entry of entries || []) {
            const lines = (entry.journal_lines as any[]) || []

            for (const line of lines) {
                const acc = line.chart_of_accounts

                let fullAccountName = ''
                let accountCode = ''
                let accountType = ''

                if (acc && acc.id) {
                    const mappedAcc = accountMap.get(acc.id)
                    if (mappedAcc) {
                        fullAccountName = getHierarchicalName(mappedAcc)
                        accountCode = mappedAcc.code
                        accountType = mappedAcc.type
                    } else {
                        fullAccountName = acc.name
                        accountCode = acc.code
                        accountType = acc.type
                    }
                }

                rows.push({
                    'Date': entry.date,
                    'Line Description': entry.description || '',
                    'Item Description': line.description || '',
                    'Ref': entry.reference_number || '',
                    'Account Code': accountCode,
                    'Account Name': fullAccountName,
                    'Account Type': accountType,
                    'Status': entry.status || 'POSTED',
                    'Debit': line.debit,
                    'Credit': line.credit
                })
            }
        }

        // 4. Generate Output based on format
        if (format === 'csv') {
            const csvData = stringify(rows, { header: true })
            return new NextResponse(csvData, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`
                }
            })
        } else if (format === 'xls') {
            const worksheet = XLSX.utils.json_to_sheet(rows)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entries")
            const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

            return new NextResponse(buf, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}.xlsx"`
                }
            })
        } else if (format === 'pdf') {
            // PDF Export with new headers
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
            const chunks: Buffer[] = []
            doc.on('data', (chunk) => chunks.push(chunk))

            doc.fontSize(18).text("Journal Entries Export", { align: 'center' })
            doc.moveDown()
            doc.fontSize(10).text(`Generated for user: ${user.email}`, { align: 'center' })
            doc.moveDown()

            // New Headers: Date, Line Desc, Item Desc, Ref, Code, Account Name, Type, Status, Debit, Credit
            const headers = ["Date", "Line Desc", "Item Desc", "Ref", "Code", "Account Name", "Type", "Status", "Debit", "Credit"]
            // Adjust widths to fit A4 Landscape (~842pts width - 60 margin = ~780)
            const colWidths = [50, 90, 90, 50, 40, 140, 50, 40, 50, 50]
            let y = doc.y
            let x = 30

            doc.font('Helvetica-Bold').fontSize(8)
            headers.forEach((h, i) => {
                doc.text(h, x, y, { width: colWidths[i], align: i >= 8 ? 'right' : 'left' })
                x += colWidths[i]
            })

            y += 15
            doc.moveTo(30, y).lineTo(770, y).stroke()
            y += 5

            doc.font('Helvetica').fontSize(7)
            for (const row of rows) {
                if (y > 550) {
                    doc.addPage()
                    y = 30
                }

                x = 30
                // Helper to render text safely
                const txt = (val: any) => String(val || '')

                doc.text(txt(row['Date']), x, y, { width: colWidths[0] })
                x += colWidths[0]
                doc.text(txt(row['Line Description']).substring(0, 30), x, y, { width: colWidths[1] })
                x += colWidths[1]
                doc.text(txt(row['Item Description']).substring(0, 30), x, y, { width: colWidths[2] })
                x += colWidths[2]
                doc.text(txt(row['Ref']).substring(0, 10), x, y, { width: colWidths[3] })
                x += colWidths[3]
                doc.text(txt(row['Account Code']), x, y, { width: colWidths[4] })
                x += colWidths[4]
                doc.text(txt(row['Account Name']).substring(0, 40), x, y, { width: colWidths[5] })
                x += colWidths[5]
                doc.text(txt(row['Account Type']).substring(0, 15), x, y, { width: colWidths[6] })
                x += colWidths[6]
                doc.text(txt(row['Status']).substring(0, 10), x, y, { width: colWidths[7] })
                x += colWidths[7]
                doc.text(txt(row['Debit']), x, y, { width: colWidths[8], align: 'right' })
                x += colWidths[8]
                doc.text(txt(row['Credit']), x, y, { width: colWidths[9], align: 'right' })

                y += 12
            }

            doc.end()
            return new Promise<NextResponse>((resolve) => {
                doc.on('end', () => {
                    const result = Buffer.concat(chunks)
                    resolve(new NextResponse(result, {
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': `attachment; filename="${filename}.pdf"`
                        }
                    }))
                })
            })
        }

        return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
